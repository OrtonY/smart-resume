package com.smartresume.application.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.List;

public final class JobApplicationDtos {

    private JobApplicationDtos() {
    }

    public record JobApplicationCreateRequest(
        @NotBlank(message = "{validation.application.companyRequired}")
        String company,
        @NotBlank(message = "{validation.application.positionRequired}")
        String position,
        @NotBlank(message = "{validation.application.statusRequired}")
        String status,
        String channel,
        String resumeId,
        LocalDateTime appliedAt,
        String notes
    ) {
    }

    public record JobApplicationUpdateRequest(
        @NotBlank(message = "{validation.application.companyRequired}")
        String company,
        @NotBlank(message = "{validation.application.positionRequired}")
        String position,
        @NotBlank(message = "{validation.application.statusRequired}")
        String status,
        String channel,
        String resumeId,
        LocalDateTime appliedAt,
        String notes
    ) {
    }

    public record JobApplicationResponse(
        String id,
        String company,
        String position,
        String status,
        String channel,
        String resumeId,
        String resumeTitle,
        LocalDateTime appliedAt,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
    }

    public record JobApplicationPageResponse(
        List<JobApplicationResponse> items,
        long total,
        int page,
        int pageSize,
        int totalPages
    ) {
    }
}
