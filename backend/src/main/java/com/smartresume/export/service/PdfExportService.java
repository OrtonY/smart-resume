package com.smartresume.export.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartresume.common.exception.AppException;
import com.smartresume.resume.dto.ResumeDtos.ResumeDetailResponse;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class PdfExportService {

    private final PdfDocumentRenderer pdfDocumentRenderer;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public PdfExportService(PdfDocumentRenderer pdfDocumentRenderer, ObjectMapper objectMapper) {
        this.pdfDocumentRenderer = pdfDocumentRenderer;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
    }

    public byte[] exportResumePdf(ResumeDetailResponse resume, String languageTag) {
        if (!pdfDocumentRenderer.isAvailable()) {
            throw AppException.of(HttpStatus.SERVICE_UNAVAILABLE, "error.export.notAvailable");
        }
        ResumeDetailResponse prepared = prepareForExport(resume);
        String payloadJson = buildPayloadJson(prepared, languageTag);
        return pdfDocumentRenderer.renderResumePdf(payloadJson);
    }

    private ResumeDetailResponse prepareForExport(ResumeDetailResponse resume) {
        if (resume.content() == null || resume.content().personalInfo() == null) {
            return resume;
        }
        String avatarUrl = resume.content().personalInfo().avatar();
        if (avatarUrl == null || avatarUrl.isBlank() || avatarUrl.startsWith("data:")) {
            return resume;
        }
        String dataUri = fetchImageAsDataUri(avatarUrl);
        if (dataUri.isEmpty()) {
            return resume;
        }
        var info = resume.content().personalInfo();
        var newInfo = new com.smartresume.resume.dto.ResumeDtos.PersonalInfo(
            info.fullName(), info.headline(), info.phone(), info.email(),
            info.city(), info.website(), info.expectedSalary(), info.age(), dataUri
        );
        var newContent = new com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload(
            newInfo, resume.content().personalSummary(),
            resume.content().education(), resume.content().workExperience(),
            resume.content().projectExperience(), resume.content().skills(),
            resume.content().honors(), resume.content().certificates()
        );
        return new ResumeDetailResponse(
            resume.id(), resume.title(), resume.templateKey(), newContent,
            resume.layout(), resume.updatedAt(), resume.deletedAt(), resume.resolvedTemplate()
        );
    }

    private String buildPayloadJson(ResumeDetailResponse resume, String languageTag) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("resume", resume);
        if (resume.resolvedTemplate() != null) {
            payload.put("templates", List.of(resume.resolvedTemplate()));
        }
        String locale = normalizeLanguageTag(languageTag);
        if (locale == null) {
            locale = LocaleContextHolder.getLocale().toLanguageTag();
        }
        if (locale.startsWith("en")) {
            payload.put("language", "en-US");
        } else {
            payload.put("language", "zh-CN");
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new PdfDocumentRenderer.PdfRenderException("Failed to serialize export payload", e);
        }
    }

    private String fetchImageAsDataUri(String url) {
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            return "";
        }
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();
            HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() != 200) {
                return "";
            }
            byte[] imageBytes = response.body().readAllBytes();
            String contentType = response.headers().firstValue("Content-Type").orElse("image/jpeg");
            return "data:" + contentType + ";base64," + Base64.getEncoder().encodeToString(imageBytes);
        } catch (IOException | InterruptedException | IllegalArgumentException e) {
            return "";
        }
    }

    private String normalizeLanguageTag(String languageTag) {
        if (languageTag == null) {
            return null;
        }
        String normalized = languageTag.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
