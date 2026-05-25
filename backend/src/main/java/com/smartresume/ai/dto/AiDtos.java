package com.smartresume.ai.dto;

import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeLayoutPayload;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public final class AiDtos {

    private AiDtos() {
    }

    public record AiConfigurationResponse(
        String vendor,
        String baseUrl,
        String modelName,
        boolean configured
    ) {
    }

    public record AiConfigurationRequest(
        @NotBlank(message = "{validation.ai.vendorRequired}")
        String vendor,
        String baseUrl,
        String apiKey,
        String modelName
    ) {
    }

    public record AiChatRequest(
        @NotBlank(message = "{validation.ai.messageRequired}")
        String message,
        String conversationId,
        @NotNull(message = "{validation.ai.resumeContextRequired}")
        @Valid
        AiResumeContext resume
    ) {
    }

    public record AiResumeScoreRequest(
        String jobDescription,
        @NotNull(message = "{validation.ai.resumeContextRequired}")
        @Valid
        AiResumeContext resume
    ) {
    }

    public record AiResumeContext(
        @NotBlank(message = "{validation.ai.resumeIdRequired}")
        String id,
        @NotBlank(message = "{validation.ai.resumeTitleRequired}")
        String title,
        @NotBlank(message = "{validation.ai.templateKeyRequired}")
        String templateKey,
        @NotNull(message = "{validation.ai.resumeContentRequired}")
        ResumeContentPayload content,
        @NotNull(message = "{validation.ai.resumeLayoutRequired}")
        ResumeLayoutPayload layout
    ) {
    }

    public record AiChatMessage(String role, String content) {
    }

    public record AiChatConversation(
        String conversationId,
        String title,
        String createdAt,
        String updatedAt
    ) {
    }

    public record AiChatEvent(String type, String content, String conversationId) {
    }

    public record AiResumeScoreSuggestionGroup(
        String title,
        List<String> suggestions
    ) {
    }

    public record AiResumeScoreResponse(
        int score,
        String summary,
        List<String> strengths,
        List<AiResumeScoreSuggestionGroup> suggestionGroups,
        boolean jobDescriptionProvided,
        String generatedAt,
        String mode
    ) {
    }

    public record PersistedAiResumeScoreResponse(
        String jobDescription,
        AiResumeScoreResponse result
    ) {
    }

    // --- Vendor metadata and model listing DTOs ---

    public record VendorMetadataResponse(
        String vendor,
        String defaultBaseUrl,
        String baseUrlPlaceholder,
        String apiKeyPlaceholder,
        String modelNamePlaceholder,
        boolean apiKeyRequired,
        List<String> suggestedModels
    ) {
    }

    public record ListModelsRequest(
        @NotBlank(message = "{validation.ai.vendorRequired}")
        String vendor,
        String baseUrl,
        String apiKey
    ) {
    }

    public record ListModelsResponse(List<String> models) {
    }
}
