package com.smartresume.interview.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

public final class InterviewAssistDtos {

    private InterviewAssistDtos() {
    }

    public record InterviewAssistResponse(
        String id,
        String messageId,
        String sessionId,
        String answerContent,
        String answerStatus,
        String candidateAnswer,
        Integer score,
        String feedback,
        String scoreStatus,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
    }

    public record InterviewScoreRequest(
        @NotBlank(message = "Candidate answer is required")
        String candidateAnswer
    ) {
    }
}
