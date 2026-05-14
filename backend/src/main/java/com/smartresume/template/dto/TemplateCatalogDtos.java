package com.smartresume.template.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public final class TemplateCatalogDtos {

    private TemplateCatalogDtos() {
    }

    public record TemplateCatalogResponse(
        String key,
        String name,
        String summary,
        String category,
        String layout,
        TemplateTheme theme,
        TemplatePreview preview,
        boolean builtIn,
        LocalDateTime updatedAt
    ) {
    }

    public record TemplateCreateRequest(
        @NotBlank(message = "Template key is required")
        String key,
        @NotBlank(message = "Template name is required")
        String name,
        @NotBlank(message = "Template summary is required")
        String summary,
        @NotBlank(message = "Template category is required")
        String category,
        @NotBlank(message = "Template layout is required")
        String layout,
        @NotNull(message = "Template theme is required")
        @Valid
        TemplateTheme theme,
        @NotNull(message = "Template preview is required")
        @Valid
        TemplatePreview preview
    ) {
    }

    public record TemplateUpdateRequest(
        @NotBlank(message = "Template name is required")
        String name,
        @NotBlank(message = "Template summary is required")
        String summary,
        @NotBlank(message = "Template category is required")
        String category,
        @NotBlank(message = "Template layout is required")
        String layout,
        @NotNull(message = "Template theme is required")
        @Valid
        TemplateTheme theme,
        @NotNull(message = "Template preview is required")
        @Valid
        TemplatePreview preview
    ) {
    }

    public record TemplateTheme(
        @NotBlank(message = "Theme pageBackground is required")
        String pageBackground,
        @NotBlank(message = "Theme borderColor is required")
        String borderColor,
        @NotBlank(message = "Theme mutedText is required")
        String mutedText,
        @NotBlank(message = "Theme accent is required")
        String accent,
        @NotBlank(message = "Theme accentSoft is required")
        String accentSoft,
        @NotBlank(message = "Theme accentText is required")
        String accentText,
        @NotBlank(message = "Theme heroBackground is required")
        String heroBackground,
        @NotBlank(message = "Theme heroText is required")
        String heroText,
        @NotBlank(message = "Theme heroMuted is required")
        String heroMuted,
        @NotBlank(message = "Theme railBackground is required")
        String railBackground,
        @NotBlank(message = "Theme panelBackground is required")
        String panelBackground
    ) {
    }

    public record TemplatePreview(
        @NotBlank(message = "Preview canvasBackground is required")
        String canvasBackground,
        @NotBlank(message = "Preview sheetBackground is required")
        String sheetBackground,
        @NotBlank(message = "Preview heroBackground is required")
        String heroBackground,
        @NotBlank(message = "Preview asideBackground is required")
        String asideBackground,
        @NotBlank(message = "Preview lineColor is required")
        String lineColor
    ) {
    }
}
