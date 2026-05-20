package com.smartresume.template.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartresume.common.exception.AppException;
import com.smartresume.template.domain.ResumeTemplateEntity;
import com.smartresume.template.dto.TemplateCatalogDtos.TemplateCatalogResponse;
import com.smartresume.template.dto.TemplateCatalogDtos.TemplateCreateRequest;
import com.smartresume.template.dto.TemplateCatalogDtos.TemplatePreview;
import com.smartresume.template.dto.TemplateCatalogDtos.TemplateTheme;
import com.smartresume.template.dto.TemplateCatalogDtos.TemplateUpdateRequest;
import com.smartresume.template.mapper.ResumeTemplateMapper;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TemplateCatalogService {

    private static final String CATALOG_RESOURCE_PATH = "templates/catalog.json";
    private static final Set<String> SUPPORTED_LAYOUTS = Set.of("classic", "two-column", "minimal", "editorial");

    private final ResumeTemplateMapper resumeTemplateMapper;
    private final ObjectMapper objectMapper;
    private volatile List<TemplateCatalogResponse> backupCatalogCache;

    public TemplateCatalogService(ResumeTemplateMapper resumeTemplateMapper, ObjectMapper objectMapper) {
        this.resumeTemplateMapper = resumeTemplateMapper;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public List<TemplateCatalogResponse> listTemplates() {
        ensureCatalogAvailable();
        return loadActiveTemplateResponses();
    }

    @Transactional
    public TemplateCatalogResponse createTemplate(TemplateCreateRequest request) {
        validateLayout(request.layout());
        ResumeTemplateEntity existing = resumeTemplateMapper.selectOneById(request.key());
        if (existing != null) {
            throw new AppException(HttpStatus.CONFLICT, "Template key already exists");
        }

        LocalDateTime now = LocalDateTime.now();
        ResumeTemplateEntity entity = new ResumeTemplateEntity();
        entity.setKey(request.key().trim());
        entity.setBuiltIn(false);
        entity.setDeleted(false);
        entity.setCreatedAt(now);
        applyEditableFields(entity, request.name(), request.summary(), request.category(), request.layout(), request.theme(), request.preview(), now);
        resumeTemplateMapper.insert(entity);
        return toResponse(entity);
    }

    @Transactional
    public TemplateCatalogResponse updateTemplate(String templateKey, TemplateUpdateRequest request) {
        validateLayout(request.layout());
        ResumeTemplateEntity entity = requireActiveTemplate(templateKey);
        if (Boolean.TRUE.equals(entity.getBuiltIn())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Built-in templates cannot be modified");
        }
        applyEditableFields(entity, request.name(), request.summary(), request.category(), request.layout(), request.theme(), request.preview(), LocalDateTime.now());
        resumeTemplateMapper.update(entity);
        return toResponse(entity);
    }

    @Transactional
    public void deleteTemplate(String templateKey) {
        ResumeTemplateEntity entity = requireActiveTemplate(templateKey);
        if (Boolean.TRUE.equals(entity.getBuiltIn())) {
            throw new AppException(HttpStatus.CONFLICT, "Built-in templates cannot be deleted. Use restore-from-backup if you need to roll them back.");
        }

        entity.setDeleted(true);
        entity.setDeletedAt(LocalDateTime.now());
        entity.setUpdatedAt(entity.getDeletedAt());
        resumeTemplateMapper.update(entity);
    }

    @Transactional
    public List<TemplateCatalogResponse> restoreBuiltInTemplatesFromBackup() {
        LocalDateTime now = LocalDateTime.now();
        for (TemplateCatalogResponse template : loadBackupCatalog()) {
            ResumeTemplateEntity entity = resumeTemplateMapper.selectOneById(template.key());
            boolean isNewEntity = entity == null;
            if (entity == null) {
                entity = new ResumeTemplateEntity();
                entity.setKey(template.key());
                entity.setCreatedAt(now);
            }

            entity.setBuiltIn(true);
            entity.setDeleted(false);
            entity.setDeletedAt(null);
            applyEditableFields(entity, template.name(), template.summary(), template.category(), template.layout(), template.theme(), template.preview(), now);

            if (isNewEntity) {
                resumeTemplateMapper.insert(entity);
            } else {
                resumeTemplateMapper.update(entity);
            }
        }

        return loadActiveTemplateResponses();
    }

    private void ensureCatalogAvailable() {
        if (resumeTemplateMapper.selectAll().stream().anyMatch(template -> !Boolean.TRUE.equals(template.getDeleted()))) {
            return;
        }
        restoreBuiltInTemplatesFromBackup();
    }

    private ResumeTemplateEntity requireActiveTemplate(String templateKey) {
        ResumeTemplateEntity entity = resumeTemplateMapper.selectOneById(templateKey);
        if (entity == null || Boolean.TRUE.equals(entity.getDeleted())) {
            throw new AppException(HttpStatus.NOT_FOUND, "Template not found");
        }
        return entity;
    }

    private List<TemplateCatalogResponse> loadActiveTemplateResponses() {
        return resumeTemplateMapper.selectAll().stream()
            .filter(template -> !Boolean.TRUE.equals(template.getDeleted()))
            .sorted(Comparator
                .comparing(ResumeTemplateEntity::getBuiltIn, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ResumeTemplateEntity::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .map(this::toResponse)
            .toList();
    }

    private void applyEditableFields(
        ResumeTemplateEntity entity,
        String name,
        String summary,
        String category,
        String layout,
        TemplateTheme theme,
        TemplatePreview preview,
        LocalDateTime now
    ) {
        entity.setName(name.trim());
        entity.setSummary(summary.trim());
        entity.setCategory(category.trim());
        entity.setLayout(layout.trim());
        entity.setThemeJson(toJson(theme));
        entity.setPreviewJson(toJson(preview));
        entity.setUpdatedAt(now);
    }

    private TemplateCatalogResponse toResponse(ResumeTemplateEntity entity) {
        return new TemplateCatalogResponse(
            entity.getKey(),
            entity.getName(),
            entity.getSummary(),
            entity.getCategory(),
            entity.getLayout(),
            fromJson(entity.getThemeJson(), TemplateTheme.class),
            fromJson(entity.getPreviewJson(), TemplatePreview.class),
            Boolean.TRUE.equals(entity.getBuiltIn()),
            entity.getUpdatedAt()
        );
    }

    private List<TemplateCatalogResponse> loadBackupCatalog() {
        List<TemplateCatalogResponse> cached = backupCatalogCache;
        if (cached != null) {
            return cached;
        }

        synchronized (this) {
            if (backupCatalogCache == null) {
                backupCatalogCache = readBackupCatalog();
            }
            return backupCatalogCache;
        }
    }

    private List<TemplateCatalogResponse> readBackupCatalog() {
        try (InputStream inputStream = new ClassPathResource(CATALOG_RESOURCE_PATH).getInputStream()) {
            List<TemplateCatalogResponse> rawCatalog = objectMapper.readerForListOf(TemplateCatalogResponse.class)
                .readValue(inputStream);
            List<TemplateCatalogResponse> catalog = rawCatalog
                .stream()
                .map(item -> new TemplateCatalogResponse(
                    item.key(),
                    item.name(),
                    item.summary(),
                    item.category(),
                    item.layout(),
                    item.theme(),
                    item.preview(),
                    true,
                    null
                ))
                .collect(Collectors.toList());
            if (catalog.isEmpty()) {
                throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Template backup catalog is empty");
            }
            return List.copyOf(catalog);
        } catch (IOException exception) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to load template backup catalog");
        }
    }

    private void validateLayout(String layout) {
        String normalizedLayout = layout == null ? "" : layout.trim();
        if (!SUPPORTED_LAYOUTS.contains(normalizedLayout)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Unsupported template layout");
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to serialize template metadata");
        }
    }

    private <T> T fromJson(String json, Class<T> targetClass) {
        try {
            return objectMapper.readValue(json, targetClass);
        } catch (IOException exception) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to parse stored template metadata");
        }
    }
}
