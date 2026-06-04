package com.smartresume.interview.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

public final class InterviewQuestionBankDtos {

    private InterviewQuestionBankDtos() {
    }

    public record QuestionBankCreateRequest(
        @NotBlank(message = "{validation.questionBank.nameRequired}")
        String name,
        String description,
        @NotNull(message = "{validation.questionBank.tagsRequired}")
        List<String> tags
    ) {
    }

    public record QuestionBankUpdateRequest(
        @NotBlank(message = "{validation.questionBank.nameRequired}")
        String name,
        String description,
        @NotNull(message = "{validation.questionBank.tagsRequired}")
        List<String> tags
    ) {
    }

    public record QuestionCreateRequest(
        @NotBlank(message = "{validation.questionBank.questionRequired}")
        @JsonAlias("content")
        String question,
        @NotBlank(message = "{validation.interview.difficultyRequired}")
        String difficulty,
        @NotNull(message = "{validation.questionBank.tagsRequired}")
        List<String> tags,
        String focusPoints
    ) {
    }

    public record QuestionUpdateRequest(
        @NotBlank(message = "{validation.questionBank.questionRequired}")
        @JsonAlias("content")
        String question,
        @NotBlank(message = "{validation.interview.difficultyRequired}")
        String difficulty,
        @NotNull(message = "{validation.questionBank.tagsRequired}")
        List<String> tags,
        String focusPoints
    ) {
    }

    public record QuestionBankResponse(
        String id,
        String name,
        String description,
        List<String> tags,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
    }

    public record QuestionResponse(
        String id,
        String questionBankId,
        String question,
        String difficulty,
        List<String> tags,
        String focusPoints,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
    }
}
