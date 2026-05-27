package com.smartresume.resume.service;

import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.resume.domain.ResumeEntity;
import com.smartresume.resume.domain.ResumeVersionEntity;
import com.smartresume.resume.domain.table.ResumeVersionEntityTableDef;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeDetailResponse;
import com.smartresume.resume.mapper.ResumeVersionMapper;
import com.smartresume.template.service.TemplateCatalogService;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ResumeVersionService {

    private final ResumeVersionMapper resumeVersionMapper;
    private final ResumeLookupService resumeLookupService;
    private final ResumeContentService resumeContentService;
    private final TemplateCatalogService templateCatalogService;

    public ResumeVersionService(
        ResumeVersionMapper resumeVersionMapper,
        ResumeLookupService resumeLookupService,
        ResumeContentService resumeContentService,
        TemplateCatalogService templateCatalogService
    ) {
        this.resumeVersionMapper = resumeVersionMapper;
        this.resumeLookupService = resumeLookupService;
        this.resumeContentService = resumeContentService;
        this.templateCatalogService = templateCatalogService;
    }

    @Transactional
    public ResumeVersionEntity captureSnapshot(String resumeId) {
        long userId = CurrentUserContext.requireUserId();
        ResumeEntity resume = resumeLookupService.requireResume(resumeId, userId);
        ResumeContentPayload content = resumeContentService.loadContent(resumeId, userId);
        ResumeVersionEntity version = new ResumeVersionEntity();
        version.setId(UUID.randomUUID().toString());
        version.setResumeId(resumeId);
        version.setUserId(userId);
        version.setVersionNumber(nextVersionNumber(resumeId, userId));
        version.setTitle(resume.getTitle());
        version.setTemplateKey(resume.getTemplateKey());
        version.setContentJson(resumeContentService.toJson(content));
        version.setLayoutJson(resumeContentService.toJson(resumeContentService.readLayoutOrDefault(resume.getLayoutJson())));
        version.setCreatedAt(LocalDateTime.now());
        resumeVersionMapper.insert(version);
        return version;
    }

    public ResumeDetailResponse getVersionSnapshot(String versionId) {
        return getVersionSnapshotForUser(versionId, CurrentUserContext.requireUserId());
    }

    public ResumeDetailResponse getVersionSnapshotForUser(String versionId, long userId) {
        ResumeVersionEntity version = resumeVersionMapper.selectOneById(versionId);
        if (version == null || !Long.valueOf(userId).equals(version.getUserId())) {
            throw AppException.of(HttpStatus.NOT_FOUND, "error.resume.snapshotNotFound");
        }
        return new ResumeDetailResponse(
            version.getResumeId(),
            version.getTitle(),
            version.getTemplateKey(),
            resumeContentService.parseContent(version.getContentJson()),
            resumeContentService.readLayoutOrDefault(version.getLayoutJson()),
            version.getCreatedAt(),
            null,
            templateCatalogService.resolveTemplateForUser(version.getTemplateKey(), userId)
        );
    }

    private int nextVersionNumber(String resumeId, long userId) {
        ResumeVersionEntityTableDef versionTable = ResumeVersionEntityTableDef.RESUME_VERSION_ENTITY;
        QueryWrapper versionQuery = QueryWrapper.create()
            .where(versionTable.RESUME_ID.eq(resumeId))
            .and(versionTable.USER_ID.eq(userId))
            .orderBy(versionTable.VERSION_NUMBER, false);
        return resumeVersionMapper.selectListByQuery(versionQuery).stream()
            .map(ResumeVersionEntity::getVersionNumber)
            .filter(Objects::nonNull)
            .max(Integer::compareTo)
            .orElse(0) + 1;
    }
}
