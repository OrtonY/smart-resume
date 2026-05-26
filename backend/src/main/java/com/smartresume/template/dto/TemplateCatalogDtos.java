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
        Object name,
        Object summary,
        Object category,
        String layout,
        TemplateTheme theme,
        TemplatePreview preview,
        boolean builtIn,
        LocalDateTime updatedAt
    ) {
    }

    public record TemplateCreateRequest(
        @NotBlank(message = "{validation.template.keyRequired}")
        String key,
        @NotBlank(message = "{validation.template.nameRequired}")
        String name,
        @NotBlank(message = "{validation.template.summaryRequired}")
        String summary,
        @NotBlank(message = "{validation.template.categoryRequired}")
        String category,
        @NotBlank(message = "{validation.template.layoutRequired}")
        String layout,
        @NotNull(message = "{validation.template.themeRequired}")
        @Valid
        TemplateTheme theme,
        @NotNull(message = "{validation.template.previewRequired}")
        @Valid
        TemplatePreview preview
    ) {
    }

    public record TemplateUpdateRequest(
        @NotBlank(message = "{validation.template.nameRequired}")
        String name,
        @NotBlank(message = "{validation.template.summaryRequired}")
        String summary,
        @NotBlank(message = "{validation.template.categoryRequired}")
        String category,
        @NotBlank(message = "{validation.template.layoutRequired}")
        String layout,
        @NotNull(message = "{validation.template.themeRequired}")
        @Valid
        TemplateTheme theme,
        @NotNull(message = "{validation.template.previewRequired}")
        @Valid
        TemplatePreview preview
    ) {
    }

    public record TemplateTheme(
        @NotBlank(message = "{validation.template.theme.pageBackgroundRequired}")
        String pageBackground,
        @NotBlank(message = "{validation.template.theme.borderColorRequired}")
        String borderColor,
        @NotBlank(message = "{validation.template.theme.mutedTextRequired}")
        String mutedText,
        @NotBlank(message = "{validation.template.theme.accentRequired}")
        String accent,
        @NotBlank(message = "{validation.template.theme.accentSoftRequired}")
        String accentSoft,
        @NotBlank(message = "{validation.template.theme.accentTextRequired}")
        String accentText,
        @NotBlank(message = "{validation.template.theme.heroBackgroundRequired}")
        String heroBackground,
        @NotBlank(message = "{validation.template.theme.heroTextRequired}")
        String heroText,
        @NotBlank(message = "{validation.template.theme.heroMutedRequired}")
        String heroMuted,
        @NotBlank(message = "{validation.template.theme.railBackgroundRequired}")
        String railBackground,
        @NotBlank(message = "{validation.template.theme.panelBackgroundRequired}")
        String panelBackground
    ) {
    }

    public record TemplatePreview(
        @NotBlank(message = "{validation.template.preview.canvasBackgroundRequired}")
        String canvasBackground,
        @NotBlank(message = "{validation.template.preview.sheetBackgroundRequired}")
        String sheetBackground,
        @NotBlank(message = "{validation.template.preview.heroBackgroundRequired}")
        String heroBackground,
        @NotBlank(message = "{validation.template.preview.asideBackgroundRequired}")
        String asideBackground,
        @NotBlank(message = "{validation.template.preview.lineColorRequired}")
        String lineColor
    ) {
    }
}
