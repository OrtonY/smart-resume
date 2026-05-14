package com.smartresume.export.controller;

import com.smartresume.common.api.ApiResponse;
import java.time.LocalDateTime;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/resumes/{resumeId}/exports")
public class ExportController {

    @PostMapping("/pdf")
    public ApiResponse<ExportPlaceholderResponse> createPdfExport(@PathVariable String resumeId) {
        return ApiResponse.success(
            new ExportPlaceholderResponse(resumeId, "PDF export scaffolded. Rendering pipeline will land in the next implementation phase.", LocalDateTime.now()),
            "Export scaffold ready"
        );
    }

    public record ExportPlaceholderResponse(String resumeId, String message, LocalDateTime requestedAt) {
    }
}
