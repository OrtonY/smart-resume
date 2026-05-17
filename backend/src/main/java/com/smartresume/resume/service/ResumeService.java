package com.smartresume.resume.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mybatisflex.core.paginate.Page;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.common.exception.AppException;
import com.smartresume.resume.domain.ResumeEntity;
import com.smartresume.resume.domain.ResumeSectionEntity;
import com.smartresume.resume.domain.ResumeVersionEntity;
import com.smartresume.resume.domain.table.ResumeEntityTableDef;
import com.smartresume.resume.dto.ResumeDtos;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeCopyRequest;
import com.smartresume.resume.dto.ResumeDtos.ResumeCreateRequest;
import com.smartresume.resume.dto.ResumeDtos.ResumeDetailResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeLayoutPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumePageResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeSummaryResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeUpdateRequest;
import com.smartresume.resume.mapper.ResumeMapper;
import com.smartresume.resume.mapper.ResumeSectionMapper;
import com.smartresume.resume.mapper.ResumeVersionMapper;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ResumeService {

    // Storage-level section types for rows in resume_sections.
    private static final List<String> STORED_SECTION_TYPES = List.of(
        "personal_info",
        "personal_summary",
        "education",
        "work_experience",
        "project_experience",
        "skills",
        "honors",
        "certificates"
    );

    // Editor layout keys for reorder/hide behavior in the resume editor.
    private static final List<String> DEFAULT_EDITOR_LAYOUT_SECTION_ORDER = List.of(
        "education",
        "summary",
        "workExperience",
        "projectExperience",
        "skills",
        "honors",
        "certificates"
    );

    private final ResumeMapper resumeMapper;
    private final ResumeSectionMapper resumeSectionMapper;
    private final ResumeVersionMapper resumeVersionMapper;
    private final ObjectMapper objectMapper;

    public ResumeService(
        ResumeMapper resumeMapper,
        ResumeSectionMapper resumeSectionMapper,
        ResumeVersionMapper resumeVersionMapper,
        ObjectMapper objectMapper
    ) {
        this.resumeMapper = resumeMapper;
        this.resumeSectionMapper = resumeSectionMapper;
        this.resumeVersionMapper = resumeVersionMapper;
        this.objectMapper = objectMapper;
    }

    public ResumePageResponse listResumes(boolean includeDeleted, boolean deletedOnly, int page, int pageSize) {
        int safePageSize = Math.max(1, pageSize);
        int safePage = Math.max(1, page);
        ResumeEntityTableDef resume = ResumeEntityTableDef.RESUME_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(deletedOnly ? resume.DELETED.eq(true) : resume.DELETED.eq(false, !includeDeleted))
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
        LocalDateTime now = LocalDateTime.now();
        ResumeEntity resume = new ResumeEntity();
        resume.setId(UUID.randomUUID().toString());
        resume.setTitle(request.title());
        resume.setTemplateKey(request.templateKey());
        resume.setLayoutJson(toJson(defaultLayout()));
        resume.setDeleted(false);
        resume.setCreatedAt(now);
        resume.setUpdatedAt(now);
        resumeMapper.insert(resume);
        saveSections(resume.getId(), defaultContent(), now);
        return getResume(resume.getId());
    }

    public ResumeDetailResponse getResume(String resumeId) {
        ResumeEntity resume = requireResume(resumeId);
        return toDetail(resume, loadContent(resumeId));
    }

    @Transactional
    public ResumeDetailResponse copyResume(String sourceResumeId, ResumeCopyRequest request) {
        ResumeEntity source = requireActiveResume(sourceResumeId);
        ResumeContentPayload sourceContent = loadContent(sourceResumeId);
        LocalDateTime now = LocalDateTime.now();

        ResumeEntity copy = new ResumeEntity();
        copy.setId(UUID.randomUUID().toString());
        copy.setTitle(request.title());
        copy.setTemplateKey(source.getTemplateKey());
        copy.setLayoutJson(toJson(readLayoutOrDefault(source.getLayoutJson())));
        copy.setDeleted(false);
        copy.setCreatedAt(now);
        copy.setUpdatedAt(now);
        resumeMapper.insert(copy);

        saveSections(copy.getId(), sourceContent, now);
        return getResume(copy.getId());
    }

    @Transactional
    public ResumeDetailResponse updateResume(String resumeId, ResumeUpdateRequest request) {
        ResumeEntity resume = requireActiveResume(resumeId);
        LocalDateTime now = LocalDateTime.now();
        resume.setTitle(request.title());
        resume.setTemplateKey(request.templateKey());
        resume.setLayoutJson(toJson(normalizeLayout(request.layout())));
        resume.setUpdatedAt(now);
        resumeMapper.update(resume);
        saveSections(resumeId, request.content(), now);
        return getResume(resumeId);
    }

    @Transactional
    public void softDeleteResume(String resumeId) {
        ResumeEntity resume = requireActiveResume(resumeId);
        LocalDateTime now = LocalDateTime.now();
        resume.setDeleted(true);
        resume.setDeletedAt(now);
        resume.setUpdatedAt(now);
        resumeMapper.update(resume);
    }

    @Transactional
    public void restoreResume(String resumeId) {
        ResumeEntity resume = requireResume(resumeId);
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
    public ResumeVersionEntity captureSnapshot(String resumeId) {
        ResumeEntity resume = requireResume(resumeId);
        ResumeContentPayload content = loadContent(resumeId);
        int nextVersion = resumeVersionMapper.selectAll().stream()
            .filter(version -> resumeId.equals(version.getResumeId()))
            .map(ResumeVersionEntity::getVersionNumber)
            .filter(Objects::nonNull)
            .max(Integer::compareTo)
            .orElse(0) + 1;

        ResumeVersionEntity version = new ResumeVersionEntity();
        version.setId(UUID.randomUUID().toString());
        version.setResumeId(resumeId);
        version.setVersionNumber(nextVersion);
        version.setTitle(resume.getTitle());
        version.setTemplateKey(resume.getTemplateKey());
        version.setContentJson(toJson(content));
        version.setLayoutJson(toJson(readLayoutOrDefault(resume.getLayoutJson())));
        version.setCreatedAt(LocalDateTime.now());
        resumeVersionMapper.insert(version);
        return version;
    }

    public ResumeDetailResponse getVersionSnapshot(String versionId) {
        ResumeVersionEntity version = resumeVersionMapper.selectOneById(versionId);
        if (version == null) {
            throw new AppException(HttpStatus.NOT_FOUND, "Resume snapshot not found");
        }
        return new ResumeDetailResponse(
            version.getResumeId(),
            version.getTitle(),
            version.getTemplateKey(),
            fromJson(version.getContentJson(), ResumeContentPayload.class),
            readLayoutOrDefault(version.getLayoutJson()),
            version.getCreatedAt(),
            null
        );
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
        return new ResumeDetailResponse(
            resume.getId(),
            resume.getTitle(),
            resume.getTemplateKey(),
            content,
            loadLayout(resume),
            resume.getUpdatedAt(),
            resume.getDeletedAt()
        );
    }

    private ResumeLayoutPayload loadLayout(ResumeEntity resume) {
        return readLayoutOrDefault(resume.getLayoutJson());
    }

    private ResumeEntity requireResume(String resumeId) {
        ResumeEntity resume = resumeMapper.selectOneById(resumeId);
        if (resume == null) {
            throw new AppException(HttpStatus.NOT_FOUND, "Resume not found");
        }
        return resume;
    }

    private ResumeEntity requireActiveResume(String resumeId) {
        ResumeEntity resume = requireResume(resumeId);
        if (Boolean.TRUE.equals(resume.getDeleted())) {
            throw new AppException(HttpStatus.CONFLICT, "Resume has been deleted");
        }
        return resume;
    }

    private ResumeContentPayload loadContent(String resumeId) {
        Map<String, String> sectionJsonByType = resumeSectionMapper.selectAll().stream()
            .filter(section -> resumeId.equals(section.getResumeId()))
            .collect(Collectors.toMap(ResumeSectionEntity::getSectionType, ResumeSectionEntity::getContentJson, (left, right) -> right));

        return new ResumeContentPayload(
            fromJson(sectionJsonByType.get("personal_info"), ResumeDtos.PersonalInfo.class),
            fromJson(sectionJsonByType.get("personal_summary"), String.class),
            readList(sectionJsonByType.get("education"), ResumeDtos.EducationItem.class),
            readList(sectionJsonByType.get("work_experience"), ResumeDtos.WorkExperienceItem.class),
            readList(sectionJsonByType.get("project_experience"), ResumeDtos.ProjectExperienceItem.class),
            readList(sectionJsonByType.get("skills"), ResumeDtos.SkillItem.class),
            readList(sectionJsonByType.get("honors"), ResumeDtos.HonorItem.class),
            readList(sectionJsonByType.get("certificates"), ResumeDtos.CertificateItem.class)
        );
    }

    private <T> List<T> readList(String json, Class<T> itemClass) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readerForListOf(itemClass).readValue(json);
        } catch (IOException exception) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to parse stored resume section");
        }
    }

    private <T> T fromJson(String json, Class<T> targetClass) {
        if (json == null || json.isBlank() || "null".equals(json)) {
            return null;
        }
        try {
            return objectMapper.readValue(json, targetClass);
        } catch (IOException exception) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to parse stored resume content");
        }
    }

    private void saveSections(String resumeId, ResumeContentPayload content, LocalDateTime now) {
        Map<String, Object> sectionValues = new LinkedHashMap<>();
        ResumeContentPayload normalizedContent = content == null ? defaultContent() : content;
        sectionValues.put("personal_info", normalizedContent.personalInfo());
        sectionValues.put("personal_summary", normalizedContent.personalSummary());
        sectionValues.put("education", normalizeList(normalizedContent.education()));
        sectionValues.put("work_experience", normalizeList(normalizedContent.workExperience()));
        sectionValues.put("project_experience", normalizeList(normalizedContent.projectExperience()));
        sectionValues.put("skills", normalizeList(normalizedContent.skills()));
        sectionValues.put("honors", normalizeList(normalizedContent.honors()));
        sectionValues.put("certificates", normalizeList(normalizedContent.certificates()));

        Map<String, ResumeSectionEntity> existingByType = resumeSectionMapper.selectAll().stream()
            .filter(section -> resumeId.equals(section.getResumeId()))
            .collect(Collectors.toMap(ResumeSectionEntity::getSectionType, section -> section, (left, right) -> right));

        for (int index = 0; index < STORED_SECTION_TYPES.size(); index++) {
            String sectionType = STORED_SECTION_TYPES.get(index);
            ResumeSectionEntity section = existingByType.getOrDefault(sectionType, new ResumeSectionEntity());
            if (section.getId() == null) {
                section.setId(UUID.randomUUID().toString());
                section.setResumeId(resumeId);
                section.setCreatedAt(now);
            }
            section.setSectionType(sectionType);
            section.setSortOrder(index);
            section.setContentJson(toJson(sectionValues.get(sectionType)));
            section.setUpdatedAt(now);

            if (existingByType.containsKey(sectionType)) {
                resumeSectionMapper.update(section);
            } else {
                resumeSectionMapper.insert(section);
            }
        }
    }

    private ResumeLayoutPayload defaultLayout() {
        return new ResumeLayoutPayload(DEFAULT_EDITOR_LAYOUT_SECTION_ORDER, List.of());
    }

    private ResumeLayoutPayload normalizeLayout(ResumeLayoutPayload layout) {
        ResumeLayoutPayload source = layout == null ? defaultLayout() : layout;
        List<String> sectionOrder = normalizeLayoutOrder(source.sectionOrder());
        List<String> hiddenSections = source.hiddenSections() == null
            ? List.of()
            : source.hiddenSections().stream()
                .filter(sectionOrder::contains)
                .distinct()
                .toList();
        return new ResumeLayoutPayload(sectionOrder, hiddenSections);
    }

    private List<String> normalizeLayoutOrder(List<String> sectionOrder) {
        List<String> source = sectionOrder == null ? DEFAULT_EDITOR_LAYOUT_SECTION_ORDER : sectionOrder;
        List<String> deduplicated = new ArrayList<>();
        for (String key : source) {
            if (key != null && !deduplicated.contains(key) && DEFAULT_EDITOR_LAYOUT_SECTION_ORDER.contains(key)) {
                deduplicated.add(key);
            }
        }
        for (String key : DEFAULT_EDITOR_LAYOUT_SECTION_ORDER) {
            if (!deduplicated.contains(key)) {
                deduplicated.add(key);
            }
        }
        return deduplicated;
    }

    private ResumeLayoutPayload readLayoutOrDefault(String json) {
        if (json == null || json.isBlank() || "null".equals(json)) {
            return defaultLayout();
        }
        try {
            return normalizeLayout(objectMapper.readValue(json, ResumeLayoutPayload.class));
        } catch (IOException exception) {
            return defaultLayout();
        }
    }

    private ResumeContentPayload defaultContent() {
        return new ResumeContentPayload(
            new ResumeDtos.PersonalInfo("", "", "", "", "", "", "", "", ""),
            "",
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of()
        );
    }

    private <T> List<T> normalizeList(List<T> source) {
        return source == null ? List.of() : new ArrayList<>(source);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to serialize resume content");
        }
    }
}
