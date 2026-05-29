package com.smartresume.export.controller;

import com.smartresume.export.service.PdfExportService;
import com.smartresume.resume.dto.ResumeDtos.ResumeDetailResponse;
import com.smartresume.resume.service.ResumeService;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/resumes/{resumeId}/exports")
public class ExportController {

    private static final String DEFAULT_EXPORT_BASENAME = "resume";

    private final ResumeService resumeService;
    private final PdfExportService pdfExportService;

    public ExportController(ResumeService resumeService, PdfExportService pdfExportService) {
        this.resumeService = resumeService;
        this.pdfExportService = pdfExportService;
    }

    @GetMapping("/pdf")
    public ResponseEntity<byte[]> exportResumePdf(
        @PathVariable String resumeId,
        @RequestHeader(value = "X-Resume-Language", required = false) String languageTag
    ) {
        ResumeDetailResponse resume = resumeService.getResume(resumeId);
        byte[] pdfBytes = pdfExportService.exportResumePdf(resume, languageTag);
        return buildPdfResponse(pdfBytes, resume.title());
    }

    public static ResponseEntity<byte[]> buildPdfResponse(byte[] pdfBytes, String title) {
        String safeTitle = sanitizeFilename(title);
        String filename = (safeTitle.isBlank() ? DEFAULT_EXPORT_BASENAME : safeTitle) + ".pdf";
        String asciiFilename = toAsciiFilename(filename);
        String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.set(
            HttpHeaders.CONTENT_DISPOSITION,
            "attachment; filename=\"" + asciiFilename + "\"; filename*=UTF-8''" + encodedFilename
        );
        headers.setContentLength(pdfBytes.length);

        return ResponseEntity.ok().headers(headers).body(pdfBytes);
    }

    private static String sanitizeFilename(String input) {
        if (input == null) {
            return "";
        }
        String trimmed = input.trim();
        if (trimmed.isEmpty()) {
            return "";
        }
        return trimmed.replaceAll("[\\\\/:*?\"<>|\\r\\n]", "")
            .replaceAll("\\s+", " ")
            .trim();
    }

    private static String toAsciiFilename(String filename) {
        StringBuilder builder = new StringBuilder(filename.length());
        for (int index = 0; index < filename.length(); index++) {
            char current = filename.charAt(index);
            if (current >= 0x20 && current <= 0x7E && current != '"' && current != '\\' && current != ';') {
                builder.append(current);
            } else {
                builder.append('_');
            }
        }

        String candidate = builder.toString().replaceAll("\\s+", " ").trim();
        int extensionIndex = candidate.lastIndexOf('.');
        String basename = extensionIndex >= 0 ? candidate.substring(0, extensionIndex) : candidate;
        String extension = extensionIndex >= 0 ? candidate.substring(extensionIndex) : "";
        String cleanedBasename = basename.replaceAll("_+", "_")
            .replaceAll("^[._\\- ]+|[._\\- ]+$", "");

        if (cleanedBasename.isBlank()) {
            return DEFAULT_EXPORT_BASENAME + (extension.isBlank() ? ".pdf" : extension);
        }
        return cleanedBasename + extension;
    }
}
