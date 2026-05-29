package com.smartresume.resume.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.resume.domain.ResumeEntity;
import com.smartresume.resume.domain.ResumeVersionEntity;
import com.smartresume.resume.domain.table.ResumeVersionEntityTableDef;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeDetailResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeLayoutPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeSnapshotShareLinkResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeVersionDetailResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeVersionSummaryResponse;
import com.smartresume.resume.mapper.ResumeMapper;
import com.smartresume.resume.mapper.ResumeVersionMapper;
import com.smartresume.share.domain.ResumeShareEntity;
import com.smartresume.share.domain.table.ResumeShareEntityTableDef;
import com.smartresume.share.mapper.ResumeShareMapper;
import com.smartresume.template.service.TemplateCatalogService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HexFormat;
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
    private final ResumeShareMapper resumeShareMapper;
    private final ResumeLookupService resumeLookupService;
    private final ResumeContentService resumeContentService;
    private final TemplateCatalogService templateCatalogService;
    private final ObjectMapper objectMapper;

    public ResumeVersionService(
        ResumeVersionMapper resumeVersionMapper,
        ResumeMapper resumeMapper,
        ResumeShareMapper resumeShareMapper,
        ResumeLookupService resumeLookupService,
        ResumeContentService resumeContentService,
        TemplateCatalogService templateCatalogService,
        ObjectMapper objectMapper
    ) {
        this.resumeVersionMapper = resumeVersionMapper;
        this.resumeMapper = resumeMapper;
        this.resumeShareMapper = resumeShareMapper;
        this.resumeLookupService = resumeLookupService;
        this.resumeContentService = resumeContentService;
        this.templateCatalogService = templateCatalogService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ResumeVersionEntity captureSnapshot(String resumeId) {
        long userId = CurrentUserContext.requireUserId();
        ResumeEntity resume = resumeLookupService.requireResume(resumeId, userId);
        ResumeContentPayload content = resumeContentService.loadContent(resumeId, userId);
        ResumeLayoutPayload layout = resumeContentService.readLayoutOrDefault(resume.getLayoutJson());
        return insertSnapshot(resume, content, layout, calculateSnapshotHash(resume, content, layout));
    }

    @Transactional
    public ResumeVersionEntity captureSnapshotIfChanged(String resumeId) {
        long userId = CurrentUserContext.requireUserId();
        ResumeEntity resume = resumeLookupService.requireResume(resumeId, userId);
        ResumeContentPayload content = resumeContentService.loadContent(resumeId, userId);
        ResumeLayoutPayload layout = resumeContentService.readLayoutOrDefault(resume.getLayoutJson());
        String currentHash = calculateSnapshotHash(resume, content, layout);
        ResumeVersionEntity latestSnapshot = latestSnapshot(resumeId, userId);
        if (latestSnapshot != null && Objects.equals(currentHash, latestSnapshot.getContentHash())) {
            return latestSnapshot;
        }
        return insertSnapshot(resume, content, layout, currentHash);
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
            .and(versionTable.DELETED.eq(false))
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
            toSnapshotResponse(version, userId),
            listSnapshotShareLinks(version.getId(), userId)
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

    @Transactional
    public void deleteVersion(String resumeId, String versionId) {
        long userId = CurrentUserContext.requireUserId();
        resumeLookupService.requireResume(resumeId, userId);
        ResumeVersionEntity version = requireVersion(versionId, resumeId, userId);
        LocalDateTime now = LocalDateTime.now();
        version.setDeleted(true);
        version.setDeletedAt(now);
        resumeVersionMapper.update(version);

        ResumeShareEntityTableDef shareTable = ResumeShareEntityTableDef.RESUME_SHARE_ENTITY;
        QueryWrapper shareQuery = QueryWrapper.create()
            .where(shareTable.USER_ID.eq(userId))
            .and(shareTable.RESUME_ID.eq(resumeId))
            .and(shareTable.TARGET_VERSION_ID.eq(versionId));
        for (ResumeShareEntity share : resumeShareMapper.selectListByQuery(shareQuery)) {
            share.setTargetVersionId(ResumeShareEntity.INVALID_TARGET_VERSION_ID);
            share.setActive(false);
            share.setUpdatedAt(now);
            resumeShareMapper.update(share);
        }
    }

    private ResumeVersionEntity insertSnapshot(
        ResumeEntity resume,
        ResumeContentPayload content,
        ResumeLayoutPayload layout,
        String contentHash
    ) {
        ResumeVersionEntity version = new ResumeVersionEntity();
        version.setId(UUID.randomUUID().toString());
        version.setResumeId(resume.getId());
        version.setUserId(resume.getUserId());
        version.setVersionNumber(nextVersionNumber(resume.getId(), resume.getUserId()));
        version.setTitle(resume.getTitle());
        version.setTemplateKey(resume.getTemplateKey());
        version.setContentJson(resumeContentService.toJson(content));
        version.setLayoutJson(resumeContentService.toJson(layout));
        version.setContentHash(contentHash);
        version.setDeleted(false);
        version.setDeletedAt(null);
        version.setCreatedAt(LocalDateTime.now());
        resumeVersionMapper.insert(version);
        return version;
    }

    private ResumeVersionEntity latestSnapshot(String resumeId, long userId) {
        ResumeVersionEntityTableDef versionTable = ResumeVersionEntityTableDef.RESUME_VERSION_ENTITY;
        QueryWrapper versionQuery = QueryWrapper.create()
            .where(versionTable.RESUME_ID.eq(resumeId))
            .and(versionTable.USER_ID.eq(userId))
            .and(versionTable.DELETED.eq(false))
            .orderBy(versionTable.VERSION_NUMBER, false)
            .orderBy(versionTable.CREATED_AT, false);
        return resumeVersionMapper.selectListByQuery(versionQuery).stream()
            .findFirst()
            .orElse(null);
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
            version.getCreatedAt(),
            listSnapshotShareLinks(version.getId(), version.getUserId())
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
        if (version == null || Boolean.TRUE.equals(version.getDeleted()) || !Long.valueOf(userId).equals(version.getUserId())) {
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

    private List<ResumeSnapshotShareLinkResponse> listSnapshotShareLinks(String versionId, long userId) {
        ResumeShareEntityTableDef shareTable = ResumeShareEntityTableDef.RESUME_SHARE_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(shareTable.USER_ID.eq(userId))
            .and(shareTable.TARGET_VERSION_ID.eq(versionId))
            .orderBy(shareTable.CREATED_AT, false);
        return resumeShareMapper.selectListByQuery(query).stream()
            .sorted(Comparator.comparing(ResumeShareEntity::getCreatedAt).reversed())
            .map(share -> new ResumeSnapshotShareLinkResponse(
                share.getTitle(),
                share.getShareCode(),
                "/share/" + share.getShareCode(),
                Boolean.TRUE.equals(share.getActive()),
                ResumeShareEntity.INVALID_TARGET_VERSION_ID.equals(share.getTargetVersionId()),
                share.getCreatedAt()
            ))
            .toList();
    }

    private String calculateSnapshotHash(ResumeEntity resume, ResumeContentPayload content, ResumeLayoutPayload layout) {
        SnapshotHashPayload payload = new SnapshotHashPayload(
            resume.getTitle(),
            resume.getTemplateKey(),
            content,
            layout
        );
        try {
            String json = objectMapper.writeValueAsString(payload);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(json.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw AppException.of(HttpStatus.INTERNAL_SERVER_ERROR, "error.resume.contentSerializeFailed");
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            throw AppException.of(HttpStatus.INTERNAL_SERVER_ERROR, "error.resume.contentSerializeFailed");
        }
    }

    private record SnapshotHashPayload(
        String title,
        String templateKey,
        ResumeContentPayload content,
        ResumeLayoutPayload layout
    ) {
    }
}
