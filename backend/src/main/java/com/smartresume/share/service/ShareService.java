package com.smartresume.share.service;

import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.resume.dto.ResumeDtos.ResumeDetailResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeVersionSummaryResponse;
import com.smartresume.resume.service.ResumeService;
import com.smartresume.share.domain.ResumeShareEntity;
import com.smartresume.share.domain.ShareAccessLogEntity;
import com.smartresume.share.domain.table.ResumeShareEntityTableDef;
import com.smartresume.share.domain.table.ShareAccessLogEntityTableDef;
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
        long userId = CurrentUserContext.requireUserId();
        String normalizedTitle = request.title() == null ? "" : request.title().trim();
        if (normalizedTitle.isEmpty()) {
            throw AppException.of(HttpStatus.BAD_REQUEST, "error.share.titleRequired");
        }
        if (normalizedTitle.length() > 50) {
            throw AppException.of(HttpStatus.BAD_REQUEST, "error.share.titleTooLong");
        }
        String normalizedMode = request.mode().trim().toUpperCase(Locale.ROOT);
        if (!"LATEST".equals(normalizedMode) && !"SNAPSHOT".equals(normalizedMode)) {
            throw AppException.of(HttpStatus.BAD_REQUEST, "error.share.invalidMode");
        }

        String normalizedPassword = normalizePassword(request.password());
        resumeService.validResume(resumeId);

        String targetVersionId = null;
        if ("SNAPSHOT".equals(normalizedMode)) {
            targetVersionId = latestSnapshotVersionId(resumeId);
            if (targetVersionId == null) {
                targetVersionId = resumeService.captureSnapshot(resumeId).getId();
            }
        }

        LocalDateTime now = LocalDateTime.now();
        ResumeShareEntity share = new ResumeShareEntity();
        share.setId(UUID.randomUUID().toString());
        share.setUserId(userId);
        share.setResumeId(resumeId);
        share.setShareCode(UUID.randomUUID().toString().replace("-", ""));
        share.setTitle(normalizedTitle);
        share.setShareMode(normalizedMode);
        share.setTargetVersionId(targetVersionId);
        share.setActive(true);
        share.setCreatedAt(now);
        share.setUpdatedAt(now);

        if (normalizedPassword != null) {
            share.setPasswordHash(passwordEncoder.encode(normalizedPassword));
        }

        resumeShareMapper.insert(share);
        return toResponse(share);
    }

    public List<ShareLinkResponse> listShares(String resumeId) {
        ResumeShareEntityTableDef shareTable = ResumeShareEntityTableDef.RESUME_SHARE_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(shareTable.RESUME_ID.eq(resumeId))
            .and(shareTable.USER_ID.eq(CurrentUserContext.requireUserId()))
            .orderBy(shareTable.CREATED_AT, false);
        return resumeShareMapper.selectListByQuery(query).stream()
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
            return resumeService.getVersionSnapshotForUser(share.getTargetVersionId(), share.getUserId());
        }
        return resumeService.getResumeForUser(share.getResumeId(), share.getUserId());
    }

    public ResumeDetailResponse getPublicShareForExport(String shareCode, String shareToken) {
        ResumeShareEntity share = findActiveShare(shareCode);

        if (share.getPasswordHash() != null) {
            shareTokenService.verifyShareToken(shareToken, shareCode);
        }

        if ("SNAPSHOT".equals(share.getShareMode())) {
            return resumeService.getVersionSnapshotForUser(share.getTargetVersionId(), share.getUserId());
        }
        return resumeService.getResumeForUser(share.getResumeId(), share.getUserId());
    }

    public ShareTokenResponse verifyPassword(String shareCode, String password) {
        ResumeShareEntity share = findActiveShare(shareCode);

        if (share.getPasswordHash() == null) {
            throw AppException.of(HttpStatus.BAD_REQUEST, "error.share.passwordNotRequired");
        }

        if (!passwordEncoder.matches(password, share.getPasswordHash())) {
            throw AppException.of(HttpStatus.UNAUTHORIZED, "error.share.passwordIncorrect");
        }

        String token = shareTokenService.createShareToken(shareCode);
        return new ShareTokenResponse(token);
    }

    public ShareAccessLogsPage getAccessLogs(String resumeId, String shareCode) {
        ResumeShareEntity share = requireOwnedShare(resumeId, shareCode);
        if (!resumeId.equals(share.getResumeId())) {
            throw AppException.of(HttpStatus.NOT_FOUND, "error.share.notFound");
        }

        ShareAccessLogEntityTableDef accessLogTable = ShareAccessLogEntityTableDef.SHARE_ACCESS_LOG_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(accessLogTable.SHARE_ID.eq(share.getId()))
            .orderBy(accessLogTable.ACCESSED_AT, false);
        List<ShareAccessLogResponse> logs = shareAccessLogMapper.selectListByQuery(query).stream()
            .map(log -> new ShareAccessLogResponse(log.getId(), log.getAccessedAt(), log.getIpAddress()))
            .toList();

        return new ShareAccessLogsPage(logs, logs.size());
    }

    @Transactional
    public void deactivateShare(String resumeId, String shareCode) {
        ResumeShareEntity share = requireOwnedShare(resumeId, shareCode);
        share.setActive(!Boolean.TRUE.equals(share.getActive()));
        share.setUpdatedAt(LocalDateTime.now());
        resumeShareMapper.update(share);
    }

    @Transactional
    public void deleteShare(String resumeId, String shareCode) {
        ResumeShareEntity share = requireOwnedShare(resumeId, shareCode);
        ShareAccessLogEntityTableDef accessLogTable = ShareAccessLogEntityTableDef.SHARE_ACCESS_LOG_ENTITY;
        QueryWrapper query = QueryWrapper.create().where(accessLogTable.SHARE_ID.eq(share.getId()));
        for (ShareAccessLogEntity log : shareAccessLogMapper.selectListByQuery(query)) {
            shareAccessLogMapper.deleteById(log.getId());
        }
        resumeShareMapper.deleteById(share.getId());
    }

    private void recordAccess(String shareId, String ipAddress) {
        ResumeShareEntity share = resumeShareMapper.selectOneById(shareId);
        ShareAccessLogEntity log = new ShareAccessLogEntity();
        log.setId(UUID.randomUUID().toString());
        log.setUserId(share == null ? null : share.getUserId());
        log.setShareId(shareId);
        log.setAccessedAt(LocalDateTime.now());
        log.setIpAddress(ipAddress != null ? ipAddress : "unknown");
        shareAccessLogMapper.insert(log);
    }

    private ResumeShareEntity findActiveShare(String shareCode) {
        ResumeShareEntityTableDef shareTable = ResumeShareEntityTableDef.RESUME_SHARE_ENTITY;
        ResumeShareEntity share = resumeShareMapper.selectListByQuery(
            QueryWrapper.create().where(shareTable.SHARE_CODE.eq(shareCode)).and(shareTable.ACTIVE.eq(true))
        ).stream().findFirst().orElse(null);
        if (share == null) {
            throw AppException.of(HttpStatus.NOT_FOUND, "error.share.notFound");
        }
        return share;
    }

    private ResumeShareEntity findShareByCode(String shareCode) {
        ResumeShareEntityTableDef shareTable = ResumeShareEntityTableDef.RESUME_SHARE_ENTITY;
        ResumeShareEntity share = resumeShareMapper.selectListByQuery(
            QueryWrapper.create().where(shareTable.SHARE_CODE.eq(shareCode))
        ).stream().findFirst().orElse(null);
        if (share == null) {
            throw AppException.of(HttpStatus.NOT_FOUND, "error.share.notFound");
        }
        return share;
    }

    private ResumeShareEntity requireOwnedShare(String resumeId, String shareCode) {
        long userId = CurrentUserContext.requireUserId();
        ResumeShareEntity share = findShareByCode(shareCode);
        if (!resumeId.equals(share.getResumeId()) || !Long.valueOf(userId).equals(share.getUserId())) {
            throw AppException.of(HttpStatus.NOT_FOUND, "error.share.notFound");
        }
        return share;
    }

    private String normalizePassword(String password) {
        if (password == null) {
            return null;
        }
        String trimmed = password.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String latestSnapshotVersionId(String resumeId) {
        return resumeService.listVersions(resumeId).stream()
            .map(ResumeVersionSummaryResponse::id)
            .findFirst()
            .orElse(null);
    }

    private ShareLinkResponse toResponse(ResumeShareEntity share) {
        ShareAccessLogEntityTableDef accessLogTable = ShareAccessLogEntityTableDef.SHARE_ACCESS_LOG_ENTITY;
        List<ShareAccessLogEntity> logs = shareAccessLogMapper.selectListByQuery(
            QueryWrapper.create().where(accessLogTable.SHARE_ID.eq(share.getId()))
        );

        long viewCount = logs.size();
        LocalDateTime lastAccessedAt = logs.stream()
            .map(ShareAccessLogEntity::getAccessedAt)
            .max(Comparator.naturalOrder())
            .orElse(null);

        return new ShareLinkResponse(
            share.getTitle(),
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
