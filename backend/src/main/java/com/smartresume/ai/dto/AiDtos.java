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
        @NotBlank(message = "AI vendor is required")
        String vendor,
        String baseUrl,
        String apiKey,
        String modelName
    ) {
    }

    public record AiChatRequest(
        @NotBlank(message = "Message is required")
        String message,
        String conversationId,
        @NotNull(message = "Resume context is required")
        @Valid
        AiResumeContext resume
    ) {
    }

    public record AiResumeContext(
        @NotBlank(message = "Resume id is required")
        String id,
        @NotBlank(message = "Resume title is required")
        String title,
        @NotBlank(message = "Template key is required")
        String templateKey,
        @NotNull(message = "Resume content is required")
        ResumeContentPayload content,
        @NotNull(message = "Resume layout is required")
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
        @NotBlank(message = "Vendor is required")
        String vendor,
        String baseUrl,
        String apiKey
    ) {
    }

    public record ListModelsResponse(List<String> models) {
    }
}
