package com.smartresume.template.controller;

import com.smartresume.common.api.ApiResponse;
import com.smartresume.template.dto.TemplateCatalogDtos.TemplateCatalogResponse;
import com.smartresume.template.dto.TemplateCatalogDtos.TemplateCreateRequest;
import com.smartresume.template.dto.TemplateCatalogDtos.TemplateUpdateRequest;
import com.smartresume.template.service.TemplateCatalogService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/templates")
public class TemplateCatalogController {

    private final TemplateCatalogService templateCatalogService;

    public TemplateCatalogController(TemplateCatalogService templateCatalogService) {
        this.templateCatalogService = templateCatalogService;
    }

    @GetMapping
    public ApiResponse<List<TemplateCatalogResponse>> listTemplates() {
        return ApiResponse.success(templateCatalogService.listTemplatesForCurrentUser());
    }

    @PostMapping
    public ApiResponse<TemplateCatalogResponse> createTemplate(@Valid @RequestBody TemplateCreateRequest request) {
        return ApiResponse.success(templateCatalogService.createTemplate(request), "Template created");
    }

    @PutMapping("/{templateKey}")
    public ApiResponse<TemplateCatalogResponse> updateTemplate(
        @PathVariable String templateKey,
        @Valid @RequestBody TemplateUpdateRequest request
    ) {
        return ApiResponse.success(templateCatalogService.updateTemplate(templateKey, request), "Template updated");
    }

    @DeleteMapping("/{templateKey}")
    public ApiResponse<Void> deleteTemplate(@PathVariable String templateKey) {
        templateCatalogService.deleteTemplate(templateKey);
        return ApiResponse.success(null, "Template deleted");
    }

    @PostMapping("/restore-from-backup")
    public ApiResponse<List<TemplateCatalogResponse>> restoreBuiltInTemplatesFromBackup() {
        return ApiResponse.success(
            templateCatalogService.restoreBuiltInTemplatesFromBackup(),
            "Built-in templates restored from backup"
        );
    }
}
