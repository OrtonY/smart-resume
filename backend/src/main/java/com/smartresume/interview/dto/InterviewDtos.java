package com.smartresume.interview.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.time.LocalDateTime;
import java.util.List;

public final class InterviewDtos {

    private InterviewDtos() {
    }

    public record InterviewCreateRequest(
        String resumeId,
        String targetCompany,
        @NotBlank(message = "{validation.interview.titleRequired}")
        String title,
        String jobDescription,
        @NotBlank(message = "{validation.interview.difficultyRequired}")
        String difficulty,
        @NotEmpty(message = "{validation.interview.rolesRequired}")
        List<@NotBlank(message = "{validation.interview.roleNotBlank}") String> interviewerRoles
    ) {
    }

    public record InterviewMessageRequest(
        @NotBlank(message = "{validation.interview.messageRequired}")
        String content
    ) {
    }

    public record InterviewSummaryResponse(
        String id,
        String resumeId,
        String resumeTitle,
        String aiConversationId,
        String title,
        String jobDescription,
        String targetCompany,
        String difficulty,
        List<String> interviewerRoles,
        List<String> companyContextSummary,
        String companyContextStatus,
        int activeRoundIndex,
        String status,
        String reportStatus,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime endedAt
    ) {
    }

    public record InterviewPageResponse(
        List<InterviewSummaryResponse> items,
        long total,
        int page,
        int pageSize,
        int totalPages
    ) {
    }

    public record InterviewMessageResponse(
        String id,
        String role,
        String content,
        int sortOrder,
        int roundIndex,
        LocalDateTime createdAt,
        String status
    ) {
    }

    public record InterviewDetailResponse(
        String id,
        String resumeId,
        String resumeTitle,
        String aiConversationId,
        String title,
        String jobDescription,
        String targetCompany,
        String difficulty,
        List<String> interviewerRoles,
        List<String> companyContextSummary,
        String companyContextStatus,
        int activeRoundIndex,
        String status,
        String reportStatus,
        String reportContent,
        List<InterviewMessageResponse> messages,
        long totalElapsedSeconds,
        LocalDateTime lastResumedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime endedAt
    ) {
    }
}
