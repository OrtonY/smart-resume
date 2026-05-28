package com.smartresume.resume.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartresume.ai.dto.AiDtos;
import com.smartresume.resume.domain.ResumeEntity;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.common.exception.AppException;
import com.smartresume.resume.domain.ResumeSectionEntity;
import com.smartresume.resume.domain.table.ResumeSectionEntityTableDef;
import com.smartresume.resume.dto.ResumeDtos;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeLayoutPayload;
import com.smartresume.resume.mapper.ResumeSectionMapper;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ResumeContentService {

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

    private static final List<String> DEFAULT_EDITOR_LAYOUT_SECTION_ORDER = List.of(
        "education",
        "summary",
        "workExperience",
        "projectExperience",
        "skills",
        "honors",
        "certificates"
    );

    private final ResumeSectionMapper resumeSectionMapper;
    private final ObjectMapper objectMapper;

    public ResumeContentService(ResumeSectionMapper resumeSectionMapper, ObjectMapper objectMapper) {
        this.resumeSectionMapper = resumeSectionMapper;
        this.objectMapper = objectMapper;
    }

    public ResumeContentPayload loadContent(String resumeId, long userId) {
        ResumeSectionEntityTableDef sectionTable = ResumeSectionEntityTableDef.RESUME_SECTION_ENTITY;
        QueryWrapper sectionQuery = QueryWrapper.create()
            .where(sectionTable.RESUME_ID.eq(resumeId))
            .and(sectionTable.USER_ID.eq(userId))
            .orderBy(sectionTable.SORT_ORDER, true);
        Map<String, String> sectionJsonByType = resumeSectionMapper.selectListByQuery(sectionQuery).stream()
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

    public ResumeContentPayload parseContent(String json) {
        return fromJson(json, ResumeContentPayload.class);
    }

    public AiDtos.AiResumeContext buildAiVisibleContext(ResumeEntity resume) {
        if (resume == null) {
            return null;
        }

        ResumeLayoutPayload normalizedLayout = readLayoutOrDefault(resume.getLayoutJson());
        List<String> visibleSectionOrder = resolveVisibleSectionOrder(normalizedLayout);
        ResumeContentPayload content = loadContent(resume.getId(), resume.getUserId());

        return new AiDtos.AiResumeContext(
            resume.getId(),
            resume.getTitle(),
            resume.getTemplateKey(),
            AiDtos.fromResumeContentPayload(content, visibleSectionOrder),
            AiDtos.fromVisibleSectionOrder(visibleSectionOrder)
        );
    }

    public String buildAiVisibleContextJson(ResumeEntity resume) {
        AiDtos.AiResumeContext context = buildAiVisibleContext(resume);
        if (context == null) {
            return "{}";
        }
        return toJson(context);
    }

    public String buildAiVisibleContentJson(ResumeEntity resume) {
        AiDtos.AiResumeContext context = buildAiVisibleContext(resume);
        if (context == null || context.content() == null) {
            return "{}";
        }
        return toJson(context.content());
    }

    public void saveSections(String resumeId, long userId, ResumeContentPayload content, LocalDateTime now) {
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

        ResumeSectionEntityTableDef sectionTable = ResumeSectionEntityTableDef.RESUME_SECTION_ENTITY;
        QueryWrapper sectionQuery = QueryWrapper.create()
            .where(sectionTable.RESUME_ID.eq(resumeId))
            .and(sectionTable.USER_ID.eq(userId))
            .orderBy(sectionTable.SORT_ORDER, true);
        Map<String, ResumeSectionEntity> existingByType = resumeSectionMapper.selectListByQuery(sectionQuery).stream()
            .collect(Collectors.toMap(ResumeSectionEntity::getSectionType, section -> section, (left, right) -> right));

        for (int index = 0; index < STORED_SECTION_TYPES.size(); index++) {
            String sectionType = STORED_SECTION_TYPES.get(index);
            ResumeSectionEntity section = existingByType.getOrDefault(sectionType, new ResumeSectionEntity());
            if (section.getId() == null) {
                section.setId(UUID.randomUUID().toString());
                section.setResumeId(resumeId);
                section.setUserId(userId);
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

    public ResumeLayoutPayload defaultLayout() {
        return new ResumeLayoutPayload(DEFAULT_EDITOR_LAYOUT_SECTION_ORDER, List.of());
    }

    public ResumeLayoutPayload normalizeLayout(ResumeLayoutPayload layout) {
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

    public ResumeLayoutPayload readLayoutOrDefault(String json) {
        if (json == null || json.isBlank() || "null".equals(json)) {
            return defaultLayout();
        }
        try {
            return normalizeLayout(objectMapper.readValue(json, ResumeLayoutPayload.class));
        } catch (IOException exception) {
            return defaultLayout();
        }
    }

    public ResumeContentPayload defaultContent() {
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

    public String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw AppException.of(HttpStatus.INTERNAL_SERVER_ERROR, "error.resume.contentSerializeFailed");
        }
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

    private <T> List<T> readList(String json, Class<T> itemClass) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readerForListOf(itemClass).readValue(json);
        } catch (IOException exception) {
            throw AppException.of(HttpStatus.INTERNAL_SERVER_ERROR, "error.resume.sectionParseFailed");
        }
    }

    private <T> T fromJson(String json, Class<T> targetClass) {
        if (json == null || json.isBlank() || "null".equals(json)) {
            return null;
        }
        try {
            return objectMapper.readValue(json, targetClass);
        } catch (IOException exception) {
            throw AppException.of(HttpStatus.INTERNAL_SERVER_ERROR, "error.resume.contentParseFailed");
        }
    }

    private <T> List<T> normalizeList(List<T> source) {
        return source == null ? List.of() : new ArrayList<>(source);
    }

    private List<String> resolveVisibleSectionOrder(ResumeLayoutPayload layout) {
        Set<String> hiddenSections = layout.hiddenSections() == null ? Set.of() : Set.copyOf(layout.hiddenSections());
        return layout.sectionOrder().stream()
            .filter(section -> !hiddenSections.contains(section))
            .toList();
    }
}
