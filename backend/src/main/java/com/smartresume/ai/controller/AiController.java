package com.smartresume.ai.controller;

import com.smartresume.ai.dto.AiDtos.AiChatEvent;
import com.smartresume.ai.dto.AiDtos.AiChatConversation;
import com.smartresume.ai.dto.AiDtos.AiChatMessage;
import com.smartresume.ai.dto.AiDtos.AiChatCompletionResponse;
import com.smartresume.ai.dto.AiDtos.AiChatRequest;
import com.smartresume.ai.dto.AiDtos.AiSuggestionStatusUpdateRequest;
import com.smartresume.ai.dto.AiDtos.AiConfigurationRequest;
import com.smartresume.ai.dto.AiDtos.AiConfigurationResponse;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreRequest;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreResponse;
import com.smartresume.ai.dto.AiDtos.ListModelsRequest;
import com.smartresume.ai.dto.AiDtos.ListModelsResponse;
import com.smartresume.ai.dto.AiDtos.PersistedAiResumeScoreResponse;
import com.smartresume.ai.dto.AiDtos.VendorMetadataResponse;
import com.smartresume.ai.provider.ChatModelProvider;
import com.smartresume.ai.provider.ChatModelProviderRegistry;
import com.smartresume.ai.provider.VendorMetadata;
import com.smartresume.ai.service.AiAgentService;
import com.smartresume.ai.service.AiChatHistoryService;
import com.smartresume.ai.service.AiConfigurationService;
import com.smartresume.ai.service.AiResumeScoringService;
import com.smartresume.common.api.ApiResponse;
import com.smartresume.common.exception.AppException;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiConfigurationService aiConfigurationService;
    private final AiAgentService aiAgentService;
    private final AiChatHistoryService aiChatHistoryService;
    private final AiResumeScoringService aiResumeScoringService;
    private final ChatModelProviderRegistry chatModelProviderRegistry;

    public AiController(
        AiConfigurationService aiConfigurationService,
        AiAgentService aiAgentService,
        AiChatHistoryService aiChatHistoryService,
        AiResumeScoringService aiResumeScoringService,
        ChatModelProviderRegistry chatModelProviderRegistry
    ) {
        this.aiConfigurationService = aiConfigurationService;
        this.aiAgentService = aiAgentService;
        this.aiChatHistoryService = aiChatHistoryService;
        this.aiResumeScoringService = aiResumeScoringService;
        this.chatModelProviderRegistry = chatModelProviderRegistry;
    }

    @GetMapping("/configuration")
    public ApiResponse<AiConfigurationResponse> getConfiguration() {
        return ApiResponse.success(aiConfigurationService.getConfiguration());
    }

    @PutMapping("/configuration")
    public ApiResponse<AiConfigurationResponse> saveConfiguration(@Valid @RequestBody AiConfigurationRequest request) {
        return ApiResponse.success(aiConfigurationService.saveConfiguration(request), "AI configuration saved");
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<AiChatEvent> streamChat(@Valid @RequestBody AiChatRequest request) {
        return aiAgentService.streamChat(request);
    }

    @PostMapping("/chat")
    public ApiResponse<AiChatCompletionResponse> completeChat(@Valid @RequestBody AiChatRequest request) {
        return ApiResponse.success(aiAgentService.completeChat(request));
    }

    @PostMapping("/resume-score")
    public ApiResponse<AiResumeScoreResponse> scoreResume(@Valid @RequestBody AiResumeScoreRequest request) {
        return ApiResponse.success(aiResumeScoringService.scoreResume(request), "Resume scored");
    }

    @GetMapping("/resumes/{resumeId}/score")
    public ApiResponse<PersistedAiResumeScoreResponse> getPersistedResumeScore(@PathVariable String resumeId) {
        return ApiResponse.success(aiResumeScoringService.getPersistedScore(resumeId));
    }

    @GetMapping("/resumes/{resumeId}/chat/conversations")
    public ApiResponse<List<AiChatConversation>> listChatConversations(@PathVariable String resumeId) {
        return ApiResponse.success(aiChatHistoryService.listConversations(resumeId));
    }

    @GetMapping("/resumes/{resumeId}/chat/conversations/{conversationId}/messages")
    public ApiResponse<List<AiChatMessage>> listChatMessages(
        @PathVariable String resumeId,
        @PathVariable String conversationId
    ) {
        return ApiResponse.success(aiChatHistoryService.listHistory(resumeId, conversationId));
    }

    @PutMapping("/resumes/{resumeId}/chat/conversations/{conversationId}/suggestions/{suggestionId}")
    public ApiResponse<Void> updateChatSuggestionStatus(
        @PathVariable String resumeId,
        @PathVariable String conversationId,
        @PathVariable String suggestionId,
        @Valid @RequestBody AiSuggestionStatusUpdateRequest request
    ) {
        aiChatHistoryService.updateSuggestionStatus(resumeId, conversationId, suggestionId, request.status());
        return ApiResponse.success(null, "AI suggestion status updated");
    }

    @GetMapping("/vendors")
    public ApiResponse<List<VendorMetadataResponse>> listVendors() {
        List<VendorMetadataResponse> vendors = chatModelProviderRegistry.getAllMetadata().stream()
            .map(meta -> new VendorMetadataResponse(
                meta.vendor(),
                meta.defaultBaseUrl(),
                meta.baseUrlPlaceholder(),
                meta.apiKeyPlaceholder(),
                meta.modelNamePlaceholder(),
                meta.apiKeyRequired(),
                meta.suggestedModels()
            ))
            .toList();
        return ApiResponse.success(vendors);
    }

    @PostMapping("/models")
    public ApiResponse<ListModelsResponse> listModels(@Valid @RequestBody ListModelsRequest request) {
        ChatModelProvider provider = chatModelProviderRegistry.findProvider(request.vendor())
            .orElseGet(() -> chatModelProviderRegistry.findProvider("OpenAI")
                .orElseThrow(() -> AppException.of(HttpStatus.BAD_REQUEST, "error.ai.unsupportedVendor", request.vendor())));
        try {
            List<String> models = provider.listModels(request.baseUrl(), request.apiKey());
            return ApiResponse.success(new ListModelsResponse(models));
        } catch (Exception e) {
            throw AppException.of(HttpStatus.BAD_REQUEST, "error.ai.modelsFetchFailed", e.getMessage());
        }
    }
}
