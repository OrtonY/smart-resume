package com.smartresume.resume.service;

import com.mybatisflex.core.paginate.Page;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.resume.domain.ResumeEntity;
import com.smartresume.resume.domain.ResumeVersionEntity;
import com.smartresume.resume.domain.table.ResumeEntityTableDef;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeCopyRequest;
import com.smartresume.resume.dto.ResumeDtos.ResumeCreateRequest;
import com.smartresume.resume.dto.ResumeDtos.ResumeDetailResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumePageResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeSummaryResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeUpdateRequest;
import com.smartresume.resume.dto.ResumeDtos.ResumeVersionDetailResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeVersionSummaryResponse;
import com.smartresume.resume.mapper.ResumeMapper;
import com.smartresume.template.dto.TemplateCatalogDtos.TemplateCatalogResponse;
import com.smartresume.template.service.TemplateCatalogService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ResumeService {

    private final ResumeMapper resumeMapper;
    private final TemplateCatalogService templateCatalogService;
    private final ResumeLookupService resumeLookupService;
    private final ResumeContentService resumeContentService;
    private final ResumeVersionService resumeVersionService;
    private final ResumePhysicalDeleteService resumePhysicalDeleteService;

    public ResumeService(
        ResumeMapper resumeMapper,
        TemplateCatalogService templateCatalogService,
        ResumeLookupService resumeLookupService,
        ResumeContentService resumeContentService,
        ResumeVersionService resumeVersionService,
        ResumePhysicalDeleteService resumePhysicalDeleteService
    ) {
        this.resumeMapper = resumeMapper;
        this.templateCatalogService = templateCatalogService;
        this.resumeLookupService = resumeLookupService;
        this.resumeContentService = resumeContentService;
        this.resumeVersionService = resumeVersionService;
        this.resumePhysicalDeleteService = resumePhysicalDeleteService;
    }

    public ResumePageResponse listResumes(boolean includeDeleted, boolean deletedOnly, int page, int pageSize) {
        int safePageSize = Math.max(1, pageSize);
        int safePage = Math.max(1, page);
        long userId = CurrentUserContext.requireUserId();
        ResumeEntityTableDef resume = ResumeEntityTableDef.RESUME_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(resume.USER_ID.eq(userId))
            .and(deletedOnly ? resume.DELETED.eq(true) : resume.DELETED.eq(false, !includeDeleted))
            .orderBy(resume.UPDATED_AT, false);
        Page<ResumeEntity> pagedResumes = resumeMapper.paginate(safePage, safePageSize, query);
        List<ResumeSummaryResponse> items = pagedResumes.getRecords().stream()
            .map(this::toSummary)
            .toList();

        return new ResumePageResponse(
            items,
            pagedResumes.getTotalRow(),
            (int) pagedResumes.getPageNumber(),
            (int) pagedResumes.getPageSize(),
            Math.max(1, (int) pagedResumes.getTotalPage())
        );
    }

    @Transactional
    public ResumeDetailResponse createResume(ResumeCreateRequest request) {
        long userId = CurrentUserContext.requireUserId();
        templateCatalogService.validateCurrentUserTemplateAccess(request.templateKey());
        LocalDateTime now = LocalDateTime.now();
        ResumeEntity resume = new ResumeEntity();
        resume.setId(UUID.randomUUID().toString());
        resume.setUserId(userId);
        resume.setTitle(request.title());
        resume.setTemplateKey(request.templateKey());
        resume.setLayoutJson(resumeContentService.toJson(resumeContentService.defaultLayout()));
        resume.setDeleted(false);
        resume.setCreatedAt(now);
        resume.setUpdatedAt(now);
        resumeMapper.insert(resume);
        resumeContentService.saveSections(resume.getId(), userId, resumeContentService.defaultContent(), now);
        return getResume(resume.getId());
    }

    @Transactional
    public ResumeDetailResponse createResumeFromContent(String title, String templateKey, ResumeContentPayload content) {
        long userId = CurrentUserContext.requireUserId();
        templateCatalogService.validateCurrentUserTemplateAccess(templateKey);
        LocalDateTime now = LocalDateTime.now();
        ResumeEntity resume = new ResumeEntity();
        resume.setId(UUID.randomUUID().toString());
        resume.setUserId(userId);
        resume.setTitle(title);
        resume.setTemplateKey(templateKey);
        resume.setLayoutJson(resumeContentService.toJson(resumeContentService.defaultLayout()));
        resume.setDeleted(false);
        resume.setCreatedAt(now);
        resume.setUpdatedAt(now);
        resumeMapper.insert(resume);
        resumeContentService.saveSections(resume.getId(), userId, content, now);
        return getResume(resume.getId());
    }

    public void validResume(String resumeId) {
        resumeLookupService.requireResume(resumeId, CurrentUserContext.requireUserId());
    }

    public ResumeDetailResponse getResume(String resumeId) {
        return getResumeForUser(resumeId, CurrentUserContext.requireUserId());
    }

    public ResumeDetailResponse getResumeForUser(String resumeId, long userId) {
        ResumeEntity resume = resumeLookupService.requireResume(resumeId, userId);
        return toDetail(resume, resumeContentService.loadContent(resumeId, userId));
    }

    @Transactional
    public ResumeDetailResponse copyResume(String sourceResumeId, ResumeCopyRequest request) {
        long userId = CurrentUserContext.requireUserId();
        ResumeEntity source = resumeLookupService.requireActiveResume(sourceResumeId, userId);
        ResumeContentPayload sourceContent = resumeContentService.loadContent(sourceResumeId, userId);
        LocalDateTime now = LocalDateTime.now();

        ResumeEntity copy = new ResumeEntity();
        copy.setId(UUID.randomUUID().toString());
        copy.setUserId(userId);
        copy.setTitle(request.title());
        copy.setTemplateKey(source.getTemplateKey());
        copy.setLayoutJson(resumeContentService.toJson(resumeContentService.readLayoutOrDefault(source.getLayoutJson())));
        copy.setDeleted(false);
        copy.setCreatedAt(now);
        copy.setUpdatedAt(now);
        resumeMapper.insert(copy);

        resumeContentService.saveSections(copy.getId(), userId, sourceContent, now);
        return getResume(copy.getId());
    }

    @Transactional
    public ResumeDetailResponse updateResume(String resumeId, ResumeUpdateRequest request) {
        long userId = CurrentUserContext.requireUserId();
        ResumeEntity resume = resumeLookupService.requireActiveResume(resumeId, userId);
        templateCatalogService.validateCurrentUserTemplateAccess(request.templateKey());
        LocalDateTime now = LocalDateTime.now();
        resume.setTitle(request.title());
        resume.setTemplateKey(request.templateKey());
        resume.setLayoutJson(resumeContentService.toJson(resumeContentService.normalizeLayout(request.layout())));
        resume.setUpdatedAt(now);
        resumeMapper.update(resume);
        resumeContentService.saveSections(resumeId, userId, request.content(), now);
        return getResume(resumeId);
    }

    @Transactional
    public void softDeleteResume(String resumeId) {
        ResumeEntity resume = resumeLookupService.requireActiveResume(resumeId, CurrentUserContext.requireUserId());
        LocalDateTime now = LocalDateTime.now();
        resume.setDeleted(true);
        resume.setDeletedAt(now);
        resume.setUpdatedAt(now);
        resumeMapper.update(resume);
    }

    @Transactional
    public void restoreResume(String resumeId) {
        ResumeEntity resume = resumeLookupService.requireResume(resumeId, CurrentUserContext.requireUserId());
        if (!Boolean.TRUE.equals(resume.getDeleted())) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        resume.setDeleted(false);
        resume.setDeletedAt(null);
        resume.setUpdatedAt(now);
        resumeMapper.update(resume);
    }

    @Transactional
    public void purgeResume(String resumeId) {
        long userId = CurrentUserContext.requireUserId();
        ResumeEntity resume = resumeLookupService.requireResume(resumeId, userId);
        if (!Boolean.TRUE.equals(resume.getDeleted())) {
            throw AppException.of(HttpStatus.CONFLICT, "error.resume.notDeleted");
        }
        resumePhysicalDeleteService.deleteResumeAndLinkedData(resumeId, userId);
    }

    @Transactional
    public ResumeVersionEntity captureSnapshot(String resumeId) {
        return resumeVersionService.captureSnapshot(resumeId);
    }

    @Transactional
    public ResumeVersionEntity captureSnapshotIfChanged(String resumeId) {
        return resumeVersionService.captureSnapshotIfChanged(resumeId);
    }

    public ResumeDetailResponse getVersionSnapshot(String versionId) {
        return resumeVersionService.getVersionSnapshot(versionId);
    }

    public ResumeDetailResponse getVersionSnapshotForUser(String versionId, long userId) {
        return resumeVersionService.getVersionSnapshotForUser(versionId, userId);
    }

    public List<ResumeVersionSummaryResponse> listVersions(String resumeId) {
        return resumeVersionService.listVersions(resumeId);
    }

    public ResumeVersionDetailResponse getVersionDetail(String resumeId, String versionId) {
        return resumeVersionService.getVersionDetail(resumeId, versionId);
    }

    @Transactional
    public ResumeDetailResponse restoreFromVersion(String resumeId, String versionId) {
        return resumeVersionService.restoreFromVersion(resumeId, versionId);
    }

    @Transactional
    public void deleteVersion(String resumeId, String versionId) {
        resumeVersionService.deleteVersion(resumeId, versionId);
    }

    private ResumeSummaryResponse toSummary(ResumeEntity resume) {
        return new ResumeSummaryResponse(
            resume.getId(),
            resume.getTitle(),
            resume.getTemplateKey(),
            Boolean.TRUE.equals(resume.getDeleted()),
            resume.getUpdatedAt()
        );
    }

    private ResumeDetailResponse toDetail(ResumeEntity resume, ResumeContentPayload content) {
        TemplateCatalogResponse resolvedTemplate = templateCatalogService.resolveTemplateForUser(
            resume.getTemplateKey(),
            resume.getUserId()
        );
        return new ResumeDetailResponse(
            resume.getId(),
            resume.getTitle(),
            resume.getTemplateKey(),
            content,
            resumeContentService.readLayoutOrDefault(resume.getLayoutJson()),
            resume.getUpdatedAt(),
            resume.getDeletedAt(),
            resolvedTemplate
        );
    }
}
