package com.smartresume.resume.service;

import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.resume.domain.ResumeEntity;
import com.smartresume.resume.domain.ResumeVersionEntity;
import com.smartresume.resume.domain.table.ResumeVersionEntityTableDef;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeDetailResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeLayoutPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeVersionDetailResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeVersionSummaryResponse;
import com.smartresume.resume.mapper.ResumeMapper;
import com.smartresume.resume.mapper.ResumeVersionMapper;
import com.smartresume.template.service.TemplateCatalogService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ResumeVersionService {

    private final ResumeVersionMapper resumeVersionMapper;
    private final ResumeMapper resumeMapper;
    private final ResumeLookupService resumeLookupService;
    private final ResumeContentService resumeContentService;
    private final TemplateCatalogService templateCatalogService;

    public ResumeVersionService(
        ResumeVersionMapper resumeVersionMapper,
        ResumeMapper resumeMapper,
        ResumeLookupService resumeLookupService,
        ResumeContentService resumeContentService,
        TemplateCatalogService templateCatalogService
    ) {
        this.resumeVersionMapper = resumeVersionMapper;
        this.resumeMapper = resumeMapper;
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
        return toSnapshotResponse(requireVersion(versionId, userId), userId);
    }

    public List<ResumeVersionSummaryResponse> listVersions(String resumeId) {
        long userId = CurrentUserContext.requireUserId();
        resumeLookupService.requireResume(resumeId, userId);
        ResumeVersionEntityTableDef versionTable = ResumeVersionEntityTableDef.RESUME_VERSION_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(versionTable.RESUME_ID.eq(resumeId))
            .and(versionTable.USER_ID.eq(userId))
            .orderBy(versionTable.VERSION_NUMBER, false)
            .orderBy(versionTable.CREATED_AT, false);
        return resumeVersionMapper.selectListByQuery(query).stream()
            .map(this::toSummaryResponse)
            .toList();
    }

    public ResumeVersionDetailResponse getVersionDetail(String resumeId, String versionId) {
        long userId = CurrentUserContext.requireUserId();
        resumeLookupService.requireResume(resumeId, userId);
        ResumeVersionEntity version = requireVersion(versionId, resumeId, userId);
        return new ResumeVersionDetailResponse(
            version.getId(),
            version.getResumeId(),
            version.getVersionNumber() == null ? 0 : version.getVersionNumber(),
            version.getCreatedAt(),
            toSnapshotResponse(version, userId)
        );
    }

    @Transactional
    public ResumeDetailResponse restoreFromVersion(String resumeId, String versionId) {
        long userId = CurrentUserContext.requireUserId();
        ResumeEntity resume = resumeLookupService.requireActiveResume(resumeId, userId);
        ResumeVersionEntity version = requireVersion(versionId, resumeId, userId);
        ResumeContentPayload snapshotContent = resumeContentService.parseContent(version.getContentJson());
        ResumeLayoutPayload snapshotLayout = resumeContentService.readLayoutOrDefault(version.getLayoutJson());
        LocalDateTime now = LocalDateTime.now();

        resume.setTitle(version.getTitle());
        resume.setTemplateKey(version.getTemplateKey());
        resume.setLayoutJson(resumeContentService.toJson(snapshotLayout));
        resume.setUpdatedAt(now);
        resumeMapper.update(resume);
        resumeContentService.saveSections(resumeId, userId, snapshotContent, now);

        return new ResumeDetailResponse(
            resume.getId(),
            resume.getTitle(),
            resume.getTemplateKey(),
            snapshotContent,
            snapshotLayout,
            resume.getUpdatedAt(),
            resume.getDeletedAt(),
            templateCatalogService.resolveTemplateForUser(resume.getTemplateKey(), userId)
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

    private ResumeVersionSummaryResponse toSummaryResponse(ResumeVersionEntity version) {
        return new ResumeVersionSummaryResponse(
            version.getId(),
            version.getResumeId(),
            version.getVersionNumber() == null ? 0 : version.getVersionNumber(),
            version.getTitle(),
            version.getTemplateKey(),
            version.getCreatedAt()
        );
    }

    private ResumeDetailResponse toSnapshotResponse(ResumeVersionEntity version, long userId) {
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

    private ResumeVersionEntity requireVersion(String versionId, long userId) {
        ResumeVersionEntity version = resumeVersionMapper.selectOneById(versionId);
        if (version == null || !Long.valueOf(userId).equals(version.getUserId())) {
            throw AppException.of(HttpStatus.NOT_FOUND, "error.resume.snapshotNotFound");
        }
        return version;
    }

    private ResumeVersionEntity requireVersion(String versionId, String resumeId, long userId) {
        ResumeVersionEntity version = requireVersion(versionId, userId);
        if (!Objects.equals(version.getResumeId(), resumeId)) {
            throw AppException.of(HttpStatus.NOT_FOUND, "error.resume.snapshotNotFound");
        }
        return version;
    }
}
