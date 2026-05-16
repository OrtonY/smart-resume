package com.smartresume.share.service;

import com.smartresume.common.exception.AppException;
import com.smartresume.resume.dto.ResumeDtos.ResumeDetailResponse;
import com.smartresume.resume.service.ResumeService;
import com.smartresume.share.domain.ResumeShareEntity;
import com.smartresume.share.domain.ShareAccessLogEntity;
import com.smartresume.share.dto.ShareDtos.CreateShareRequest;
import com.smartresume.share.dto.ShareDtos.ShareAccessLogResponse;
import com.smartresume.share.dto.ShareDtos.ShareAccessLogsPage;
import com.smartresume.share.dto.ShareDtos.ShareLinkResponse;
import com.smartresume.share.dto.ShareDtos.ShareTokenResponse;
import com.smartresume.share.mapper.ResumeShareMapper;
import com.smartresume.share.mapper.ShareAccessLogMapper;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShareService {

    private final ResumeShareMapper resumeShareMapper;
    private final ShareAccessLogMapper shareAccessLogMapper;
    private final ResumeService resumeService;
    private final ShareTokenService shareTokenService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public ShareService(ResumeShareMapper resumeShareMapper, ShareAccessLogMapper shareAccessLogMapper,
                        ResumeService resumeService, ShareTokenService shareTokenService) {
        this.resumeShareMapper = resumeShareMapper;
        this.shareAccessLogMapper = shareAccessLogMapper;
        this.resumeService = resumeService;
        this.shareTokenService = shareTokenService;
    }

    @Transactional
    public ShareLinkResponse createShare(String resumeId, CreateShareRequest request) {
        String normalizedMode = request.mode().trim().toUpperCase(Locale.ROOT);
        if (!"LATEST".equals(normalizedMode) && !"SNAPSHOT".equals(normalizedMode)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Share mode must be LATEST or SNAPSHOT");
        }

        String targetVersionId = null;
        if ("SNAPSHOT".equals(normalizedMode)) {
            targetVersionId = resumeService.captureSnapshot(resumeId).getId();
        } else {
            resumeService.getResume(resumeId);
        }

        LocalDateTime now = LocalDateTime.now();
        ResumeShareEntity share = new ResumeShareEntity();
        share.setId(UUID.randomUUID().toString());
        share.setResumeId(resumeId);
        share.setShareCode(UUID.randomUUID().toString().replace("-", ""));
        share.setShareMode(normalizedMode);
        share.setTargetVersionId(targetVersionId);
        share.setActive(true);
        share.setCreatedAt(now);
        share.setUpdatedAt(now);

        if (request.password() != null && !request.password().isBlank()) {
            share.setPasswordHash(passwordEncoder.encode(request.password()));
        }

        resumeShareMapper.insert(share);
        return toResponse(share);
    }

    public List<ShareLinkResponse> listShares(String resumeId) {
        return resumeShareMapper.selectAll().stream()
            .filter(share -> resumeId.equals(share.getResumeId()))
            .sorted(Comparator.comparing(ResumeShareEntity::getCreatedAt).reversed())
            .map(this::toResponse)
            .toList();
    }

    public ResumeDetailResponse getPublicShare(String shareCode, String shareToken, String ipAddress) {
        ResumeShareEntity share = findActiveShare(shareCode);

        if (share.getPasswordHash() != null) {
            shareTokenService.verifyShareToken(shareToken, shareCode);
        }

        recordAccess(share.getId(), ipAddress);

        if ("SNAPSHOT".equals(share.getShareMode())) {
            return resumeService.getVersionSnapshot(share.getTargetVersionId());
        }
        return resumeService.getResume(share.getResumeId());
    }

    public ShareTokenResponse verifyPassword(String shareCode, String password) {
        ResumeShareEntity share = findActiveShare(shareCode);

        if (share.getPasswordHash() == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "This share link does not require a password");
        }

        if (!passwordEncoder.matches(password, share.getPasswordHash())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Incorrect password");
        }

        String token = shareTokenService.createShareToken(shareCode);
        return new ShareTokenResponse(token);
    }

    public ShareAccessLogsPage getAccessLogs(String resumeId, String shareCode) {
        ResumeShareEntity share = findShareByCode(shareCode);
        if (!resumeId.equals(share.getResumeId())) {
            throw new AppException(HttpStatus.NOT_FOUND, "Share link not found");
        }

        List<ShareAccessLogResponse> logs = shareAccessLogMapper.selectAll().stream()
            .filter(log -> share.getId().equals(log.getShareId()))
            .sorted(Comparator.comparing(ShareAccessLogEntity::getAccessedAt).reversed())
            .map(log -> new ShareAccessLogResponse(log.getId(), log.getAccessedAt(), log.getIpAddress()))
            .toList();

        return new ShareAccessLogsPage(logs, logs.size());
    }

    @Transactional
    public void deactivateShare(String resumeId, String shareCode) {
        ResumeShareEntity share = findShareByCode(shareCode);
        if (!resumeId.equals(share.getResumeId())) {
            throw new AppException(HttpStatus.NOT_FOUND, "Share link not found");
        }
        share.setActive(!Boolean.TRUE.equals(share.getActive()));
        share.setUpdatedAt(LocalDateTime.now());
        resumeShareMapper.update(share);
    }

    @Transactional
    public void deleteShare(String resumeId, String shareCode) {
        ResumeShareEntity share = findShareByCode(shareCode);
        if (!resumeId.equals(share.getResumeId())) {
            throw new AppException(HttpStatus.NOT_FOUND, "Share link not found");
        }
        // Delete access logs first
        shareAccessLogMapper.selectAll().stream()
            .filter(log -> share.getId().equals(log.getShareId()))
            .forEach(log -> shareAccessLogMapper.deleteById(log.getId()));
        resumeShareMapper.deleteById(share.getId());
    }

    private void recordAccess(String shareId, String ipAddress) {
        ShareAccessLogEntity log = new ShareAccessLogEntity();
        log.setId(UUID.randomUUID().toString());
        log.setShareId(shareId);
        log.setAccessedAt(LocalDateTime.now());
        log.setIpAddress(ipAddress != null ? ipAddress : "unknown");
        shareAccessLogMapper.insert(log);
    }

    private ResumeShareEntity findActiveShare(String shareCode) {
        return resumeShareMapper.selectAll().stream()
            .filter(candidate -> shareCode.equals(candidate.getShareCode()))
            .filter(candidate -> Boolean.TRUE.equals(candidate.getActive()))
            .findFirst()
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Share link not found"));
    }

    private ResumeShareEntity findShareByCode(String shareCode) {
        return resumeShareMapper.selectAll().stream()
            .filter(candidate -> shareCode.equals(candidate.getShareCode()))
            .findFirst()
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Share link not found"));
    }

    private ShareLinkResponse toResponse(ResumeShareEntity share) {
        List<ShareAccessLogEntity> logs = shareAccessLogMapper.selectAll().stream()
            .filter(log -> share.getId().equals(log.getShareId()))
            .toList();

        long viewCount = logs.size();
        LocalDateTime lastAccessedAt = logs.stream()
            .map(ShareAccessLogEntity::getAccessedAt)
            .max(Comparator.naturalOrder())
            .orElse(null);

        return new ShareLinkResponse(
            share.getShareCode(),
            share.getShareMode(),
            "/share/" + share.getShareCode(),
            share.getTargetVersionId(),
            share.getPasswordHash() != null,
            Boolean.TRUE.equals(share.getActive()),
            viewCount,
            lastAccessedAt,
            share.getCreatedAt()
        );
    }
}
