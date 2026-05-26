package com.smartresume.template.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mybatisflex.core.query.QueryCondition;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.common.util.LocalizedFields;
import com.smartresume.template.domain.ResumeTemplateEntity;
import com.smartresume.template.domain.table.ResumeTemplateEntityTableDef;
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

import static com.mybatisflex.core.query.QueryMethods.lower;

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
    public List<TemplateCatalogResponse> listTemplatesForCurrentUser() {
        long userId = CurrentUserContext.requireUserId();
        ensureBuiltInCatalogAvailable();
        return loadAccessibleTemplateResponses(userId);
    }

    @Transactional
    public List<TemplateCatalogResponse> listPublicTemplates() {
        ensureBuiltInCatalogAvailable();
        return loadBuiltInTemplateResponses();
    }

    @Transactional
    public TemplateCatalogResponse createTemplate(TemplateCreateRequest request) {
        long userId = CurrentUserContext.requireUserId();
        validateLayout(request.layout());
        String templateKey = request.key().trim();
        ResumeTemplateEntity existing = resumeTemplateMapper.selectOneById(templateKey);
        if (existing != null && !Boolean.TRUE.equals(existing.getDeleted())) {
            throw AppException.of(HttpStatus.CONFLICT, "error.template.keyExists");
        }

        LocalDateTime now = LocalDateTime.now();
        ResumeTemplateEntity entity = existing == null ? new ResumeTemplateEntity() : existing;
        entity.setKey(templateKey);
        entity.setUserId(userId);
        entity.setBuiltIn(false);
        entity.setDeleted(false);
        entity.setDeletedAt(null);
        if (entity.getCreatedAt() == null) {
            entity.setCreatedAt(now);
        }
        applyEditableFields(entity, request.name(), request.summary(), request.category(), request.layout(), request.theme(), request.preview(), now);

        if (existing == null) {
            resumeTemplateMapper.insert(entity);
        } else {
            resumeTemplateMapper.update(entity);
        }
        return toResponse(entity);
    }

    @Transactional
    public TemplateCatalogResponse updateTemplate(String templateKey, TemplateUpdateRequest request) {
        validateLayout(request.layout());
        ResumeTemplateEntity entity = requireCurrentUserCustomTemplate(templateKey);
        applyEditableFields(entity, request.name(), request.summary(), request.category(), request.layout(), request.theme(), request.preview(), LocalDateTime.now());
        resumeTemplateMapper.update(entity);
        return toResponse(entity);
    }

    @Transactional
    public void deleteTemplate(String templateKey) {
        ResumeTemplateEntity entity = requireCurrentUserCustomTemplate(templateKey);
        entity.setDeleted(true);
        entity.setDeletedAt(LocalDateTime.now());
        entity.setUpdatedAt(entity.getDeletedAt());
        resumeTemplateMapper.update(entity);
    }

    @Transactional
    public List<TemplateCatalogResponse> restoreBuiltInTemplatesFromBackup() {
        CurrentUserContext.requireAdmin();
        LocalDateTime now = LocalDateTime.now();
        for (TemplateCatalogResponse template : loadBackupCatalog()) {
            ResumeTemplateEntity entity = resumeTemplateMapper.selectOneById(template.key());
            boolean isNewEntity = entity == null;
            if (entity == null) {
                entity = new ResumeTemplateEntity();
                entity.setKey(template.key());
                entity.setCreatedAt(now);
            }

            entity.setUserId(null);
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

        return loadAccessibleTemplateResponses(CurrentUserContext.requireUserId());
    }

    public TemplateCatalogResponse validateCurrentUserTemplateAccess(String templateKey) {
        return resolveAccessibleTemplate(templateKey, CurrentUserContext.requireUserId())
            .orElseThrow(() -> AppException.of(HttpStatus.NOT_FOUND, "error.template.notFound"));
    }

    public TemplateCatalogResponse resolveTemplateForUser(String templateKey, long userId) {
        return resolveAccessibleTemplate(templateKey, userId).orElse(null);
    }

    private void ensureBuiltInCatalogAvailable() {
        ResumeTemplateEntityTableDef table = ResumeTemplateEntityTableDef.RESUME_TEMPLATE_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(table.BUILT_IN.eq(true))
            .and(table.DELETED.eq(false));
        if (resumeTemplateMapper.selectCountByQuery(query) > 0) {
            return;
        }
        restoreBuiltInTemplatesWithoutAuth();
    }

    private void restoreBuiltInTemplatesWithoutAuth() {
        LocalDateTime now = LocalDateTime.now();
        for (TemplateCatalogResponse template : loadBackupCatalog()) {
            ResumeTemplateEntity entity = resumeTemplateMapper.selectOneById(template.key());
            boolean isNewEntity = entity == null;
            if (entity == null) {
                entity = new ResumeTemplateEntity();
                entity.setKey(template.key());
                entity.setCreatedAt(now);
            }
            entity.setUserId(null);
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
    }

    private ResumeTemplateEntity requireCurrentUserCustomTemplate(String templateKey) {
        long userId = CurrentUserContext.requireUserId();
        ResumeTemplateEntity entity = requireActiveTemplate(templateKey);
        if (Boolean.TRUE.equals(entity.getBuiltIn())) {
            throw AppException.of(HttpStatus.FORBIDDEN, "error.template.builtInImmutable");
        }
        if (!Long.valueOf(userId).equals(entity.getUserId())) {
            throw AppException.of(HttpStatus.NOT_FOUND, "error.template.notFound");
        }
        return entity;
    }

    private ResumeTemplateEntity requireActiveTemplate(String templateKey) {
        ResumeTemplateEntity entity = resumeTemplateMapper.selectOneById(templateKey);
        if (entity == null || Boolean.TRUE.equals(entity.getDeleted())) {
            throw AppException.of(HttpStatus.NOT_FOUND, "error.template.notFound");
        }
        return entity;
    }

    private List<TemplateCatalogResponse> loadAccessibleTemplateResponses(long userId) {
        ResumeTemplateEntityTableDef table = ResumeTemplateEntityTableDef.RESUME_TEMPLATE_ENTITY;
        QueryCondition accessible = table.BUILT_IN.eq(true).or(table.USER_ID.eq(userId));
        QueryWrapper query = QueryWrapper.create()
            .where(table.DELETED.eq(false))
            .and(accessible)
            .orderBy(table.BUILT_IN, false)
            .orderBy(table.UPDATED_AT, false)
            .orderBy(table.KEY, true);
        return resumeTemplateMapper.selectListByQuery(query).stream()
            .map(this::toResponse)
            .toList();
    }

    private List<TemplateCatalogResponse> loadBuiltInTemplateResponses() {
        ResumeTemplateEntityTableDef table = ResumeTemplateEntityTableDef.RESUME_TEMPLATE_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(table.BUILT_IN.eq(true))
            .and(table.DELETED.eq(false))
            .orderBy(table.UPDATED_AT, false)
            .orderBy(table.KEY, true);
        return resumeTemplateMapper.selectListByQuery(query).stream()
            .map(this::toResponse)
            .toList();
    }

    private java.util.Optional<TemplateCatalogResponse> resolveAccessibleTemplate(String templateKey, long userId) {
        ResumeTemplateEntity entity = resumeTemplateMapper.selectOneById(templateKey);
        if (entity == null || Boolean.TRUE.equals(entity.getDeleted())) {
            return java.util.Optional.empty();
        }
        if (Boolean.TRUE.equals(entity.getBuiltIn()) || Long.valueOf(userId).equals(entity.getUserId())) {
            return java.util.Optional.of(toResponse(entity));
        }
        return java.util.Optional.empty();
    }

    private void applyEditableFields(
        ResumeTemplateEntity entity,
        Object name,
        Object summary,
        Object category,
        String layout,
        TemplateTheme theme,
        TemplatePreview preview,
        LocalDateTime now
    ) {
        entity.setName(encodeLocalized(name));
        entity.setSummary(encodeLocalized(summary));
        entity.setCategory(encodeLocalized(category));
        entity.setLayout(layout.trim());
        entity.setThemeJson(toJson(theme));
        entity.setPreviewJson(toJson(preview));
        entity.setUpdatedAt(now);
    }

    private String encodeLocalized(Object field) {
        if (field instanceof CharSequence s) {
            return s.toString().trim();
        }
        return LocalizedFields.encodeForStorage(field, objectMapper);
    }

    private TemplateCatalogResponse toResponse(ResumeTemplateEntity entity) {
        return new TemplateCatalogResponse(
            entity.getKey(),
            LocalizedFields.decodeStored(entity.getName(), objectMapper),
            LocalizedFields.decodeStored(entity.getSummary(), objectMapper),
            LocalizedFields.decodeStored(entity.getCategory(), objectMapper),
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
            List<TemplateCatalogResponse> catalog = rawCatalog.stream()
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
                throw AppException.of(HttpStatus.INTERNAL_SERVER_ERROR, "error.template.backupEmpty");
            }
            return List.copyOf(catalog);
        } catch (IOException exception) {
            throw AppException.of(HttpStatus.INTERNAL_SERVER_ERROR, "error.template.backupLoadFailed");
        }
    }

    private void validateLayout(String layout) {
        String normalizedLayout = layout == null ? "" : layout.trim();
        if (!SUPPORTED_LAYOUTS.contains(normalizedLayout)) {
            throw AppException.of(HttpStatus.BAD_REQUEST, "error.template.unsupportedLayout");
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw AppException.of(HttpStatus.INTERNAL_SERVER_ERROR, "error.template.metadataSerializeFailed");
        }
    }

    private <T> T fromJson(String json, Class<T> targetClass) {
        try {
            return objectMapper.readValue(json, targetClass);
        } catch (IOException exception) {
            throw AppException.of(HttpStatus.INTERNAL_SERVER_ERROR, "error.template.metadataParseFailed");
        }
    }
}
