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
        @NotBlank(message = "Interview title is required")
        String title,
        @NotBlank(message = "Job description is required")
        String jobDescription,
        @NotBlank(message = "Interview difficulty is required")
        String difficulty,
        @NotEmpty(message = "At least one interviewer role is required")
        List<@NotBlank(message = "Interviewer role cannot be blank") String> interviewerRoles
    ) {
    }

    public record InterviewMessageRequest(
        @NotBlank(message = "Message content is required")
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
        String difficulty,
        List<String> interviewerRoles,
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
        LocalDateTime createdAt
    ) {
    }

    public record InterviewDetailResponse(
        String id,
        String resumeId,
        String resumeTitle,
        String aiConversationId,
        String title,
        String jobDescription,
        String difficulty,
        List<String> interviewerRoles,
        int activeRoundIndex,
        String status,
        String reportStatus,
        String reportContent,
        List<InterviewMessageResponse> messages,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime endedAt
    ) {
    }
}
