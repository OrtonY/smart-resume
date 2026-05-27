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
        String filename = (safeTitle.isBlank() ? "resume" : safeTitle) + ".pdf";
        String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.set(HttpHeaders.CONTENT_DISPOSITION,
            "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encodedFilename);
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
}
