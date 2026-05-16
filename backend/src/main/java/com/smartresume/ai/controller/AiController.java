package com.smartresume.ai.controller;

import com.smartresume.ai.dto.AiDtos.AiChatEvent;
import com.smartresume.ai.dto.AiDtos.AiChatConversation;
import com.smartresume.ai.dto.AiDtos.AiChatMessage;
import com.smartresume.ai.dto.AiDtos.AiChatRequest;
import com.smartresume.ai.dto.AiDtos.AiConfigurationRequest;
import com.smartresume.ai.dto.AiDtos.AiConfigurationResponse;
import com.smartresume.ai.service.AiAgentService;
import com.smartresume.ai.service.AiChatHistoryService;
import com.smartresume.ai.service.AiConfigurationService;
import com.smartresume.common.api.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
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

    public AiController(
        AiConfigurationService aiConfigurationService,
        AiAgentService aiAgentService,
        AiChatHistoryService aiChatHistoryService
    ) {
        this.aiConfigurationService = aiConfigurationService;
        this.aiAgentService = aiAgentService;
        this.aiChatHistoryService = aiChatHistoryService;
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
}
