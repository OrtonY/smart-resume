package com.smartresume.export.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.smartresume.resume.dto.ResumeDtos.PersonalInfo;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeDetailResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeLayoutPayload;
import com.smartresume.template.dto.TemplateCatalogDtos.TemplateCatalogResponse;
import com.smartresume.template.dto.TemplateCatalogDtos.TemplatePreview;
import com.smartresume.template.dto.TemplateCatalogDtos.TemplateTheme;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

class PdfExportServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @Test
    void prepareForExportPassesThroughDataUriAvatar() throws Exception {
        PersonalInfo info = new PersonalInfo(
            "张三", "工程师", "13800000000", "test@example.com",
            "北京", "", "", "28",
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="
        );
        ResumeContentPayload content = new ResumeContentPayload(
            info, "简介", List.of(), List.of(), List.of(), List.of(), List.of(), List.of()
        );
        ResumeDetailResponse resume = new ResumeDetailResponse(
            "r1", "Test", "north-star", content,
            new ResumeLayoutPayload(List.of("summary"), List.of()),
            LocalDateTime.now(), null, null
        );

        PdfExportService service = new PdfExportService(null, objectMapper);
        String json = objectMapper.writeValueAsString(resume);
        assertThat(json).contains("data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==");
    }

    @Test
    void handlesNullContent() throws Exception {
        ResumeDetailResponse resume = new ResumeDetailResponse(
            "r1", "Empty", "north-star", null,
            new ResumeLayoutPayload(List.of(), List.of()),
            LocalDateTime.now(), null, null
        );

        String json = objectMapper.writeValueAsString(resume);
        assertThat(json).contains("\"content\":null");
    }

    @Test
    void handlesNullAvatar() throws Exception {
        PersonalInfo info = new PersonalInfo(
            "张三", "工程师", "", "", "", "", "", "", null
        );
        ResumeContentPayload content = new ResumeContentPayload(
            info, "", List.of(), List.of(), List.of(), List.of(), List.of(), List.of()
        );
        ResumeDetailResponse resume = new ResumeDetailResponse(
            "r1", "No Avatar", "north-star", content,
            new ResumeLayoutPayload(List.of(), List.of()),
            LocalDateTime.now(), null, null
        );

        String json = objectMapper.writeValueAsString(resume);
        assertThat(json).contains("\"avatar\":null");
    }

    @Test
    void exportPayloadIncludesResolvedTemplateForPreviewParity() throws Exception {
        PdfDocumentRenderer renderer = Mockito.mock(PdfDocumentRenderer.class);
        when(renderer.isAvailable()).thenReturn(true);
        when(renderer.renderResumePdf(anyString())).thenReturn(new byte[] {1, 2, 3});

        TemplateCatalogResponse resolvedTemplate = new TemplateCatalogResponse(
            "custom-preview",
            "自定义模板",
            "desc",
            "category",
            "classic",
            new TemplateTheme(
                "#ffffff",
                "rgba(0, 0, 0, 0.1)",
                "rgba(0, 0, 0, 0.6)",
                "#3157a4",
                "rgba(49, 87, 164, 0.1)",
                "#3157a4",
                "linear-gradient(180deg, #123456, #345678)",
                "#ffffff",
                "rgba(255, 255, 255, 0.7)",
                "linear-gradient(180deg, #f7f9fc, #ffffff)",
                "rgba(49, 87, 164, 0.08)"
            ),
            new TemplatePreview(
                "linear-gradient(180deg, #f7f9fc, #ffffff)",
                "#ffffff",
                "linear-gradient(180deg, #123456, #345678)",
                "rgba(49, 87, 164, 0.08)",
                "rgba(20, 33, 61, 0.12)"
            ),
            false,
            LocalDateTime.of(2026, 5, 24, 12, 0)
        );

        PersonalInfo info = new PersonalInfo(
            "张三", "工程师", "", "", "", "", "", "", null
        );
        ResumeContentPayload content = new ResumeContentPayload(
            info, "", List.of(), List.of(), List.of(), List.of(), List.of(), List.of()
        );
        ResumeDetailResponse resume = new ResumeDetailResponse(
            "r1", "Custom Template Resume", "custom-preview", content,
            new ResumeLayoutPayload(List.of("summary"), List.of()),
            LocalDateTime.now(), null, resolvedTemplate
        );

        PdfExportService service = new PdfExportService(renderer, objectMapper);
        service.exportResumePdf(resume, "zh-CN");

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(renderer).renderResumePdf(payloadCaptor.capture());
        var payload = objectMapper.readTree(payloadCaptor.getValue());
        assertThat(payload.path("templates")).hasSize(1);
        assertThat(payload.path("templates").get(0).path("key").asText()).isEqualTo("custom-preview");
        assertThat(payload.path("language").asText()).isEqualTo("zh-CN");
    }
}
