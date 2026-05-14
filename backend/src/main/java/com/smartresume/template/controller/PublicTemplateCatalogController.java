package com.smartresume.template.controller;

import com.smartresume.common.api.ApiResponse;
import com.smartresume.template.dto.TemplateCatalogDtos.TemplateCatalogResponse;
import com.smartresume.template.service.TemplateCatalogService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/templates")
public class PublicTemplateCatalogController {

    private final TemplateCatalogService templateCatalogService;

    public PublicTemplateCatalogController(TemplateCatalogService templateCatalogService) {
        this.templateCatalogService = templateCatalogService;
    }

    @GetMapping
    public ApiResponse<List<TemplateCatalogResponse>> listTemplates() {
        return ApiResponse.success(templateCatalogService.listTemplates());
    }
}
