package com.smartresume.share.service;

import com.smartresume.common.exception.AppException;
import com.smartresume.resume.dto.ResumeDtos.ResumeDetailResponse;
import com.smartresume.resume.service.ResumeService;
import com.smartresume.share.domain.ResumeShareEntity;
import com.smartresume.share.dto.ShareDtos.CreateShareRequest;
import com.smartresume.share.dto.ShareDtos.ShareLinkResponse;
import com.smartresume.share.mapper.ResumeShareMapper;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShareService {

    private final ResumeShareMapper resumeShareMapper;
    private final ResumeService resumeService;

    public ShareService(ResumeShareMapper resumeShareMapper, ResumeService resumeService) {
        this.resumeShareMapper = resumeShareMapper;
        this.resumeService = resumeService;
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
        resumeShareMapper.insert(share);

        return toResponse(share);
    }

    public List<ShareLinkResponse> listShares(String resumeId) {
        return resumeShareMapper.selectAll().stream()
            .filter(share -> resumeId.equals(share.getResumeId()))
            .filter(share -> Boolean.TRUE.equals(share.getActive()))
            .sorted(Comparator.comparing(ResumeShareEntity::getCreatedAt).reversed())
            .map(this::toResponse)
            .toList();
    }

    public ResumeDetailResponse getPublicShare(String shareCode) {
        ResumeShareEntity share = resumeShareMapper.selectAll().stream()
            .filter(candidate -> shareCode.equals(candidate.getShareCode()))
            .filter(candidate -> Boolean.TRUE.equals(candidate.getActive()))
            .findFirst()
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Share link not found"));

        if ("SNAPSHOT".equals(share.getShareMode())) {
            return resumeService.getVersionSnapshot(share.getTargetVersionId());
        }
        return resumeService.getResume(share.getResumeId());
    }

    private ShareLinkResponse toResponse(ResumeShareEntity share) {
        return new ShareLinkResponse(
            share.getShareCode(),
            share.getShareMode(),
            "/share/" + share.getShareCode(),
            share.getTargetVersionId(),
            share.getCreatedAt()
        );
    }
}
