package com.smartresume.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartresume.ai.dto.AiDtos.AiChatEvent;
import com.smartresume.ai.dto.AiDtos.AiChatRequest;
import com.smartresume.ai.dto.AiDtos.AiResumeContext;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.common.exception.AppException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.List;

@Service
public class AiAgentService {

    private static final Duration CHARACTER_STREAM_DELAY = Duration.ofMillis(12);
    private static final String CHAT_SYSTEM_PROMPT = """
        You are a resume editing assistant.
        Answer based on the bound resume JSON context and the conversation memory.
        Do not invent facts that are not present in the resume.
        If the user asks for changes, give clear suggestions in chat. Do not modify data directly.
        Default to Chinese unless the user explicitly requests another language.
        """;

    private final AiChatService aiChatService;
    private final AiChatHistoryService aiChatHistoryService;
    private final ObjectMapper objectMapper;

    public AiAgentService(
        AiChatService aiChatService,
        AiChatHistoryService aiChatHistoryService,
        ObjectMapper objectMapper
    ) {
        this.aiChatService = aiChatService;
        this.aiChatHistoryService = aiChatHistoryService;
        this.objectMapper = objectMapper;
    }

    public Flux<AiChatEvent> streamChat(AiChatRequest request) {
        return Flux.defer(() -> {
            String conversationId = aiChatHistoryService.resolveConversationId(
                request.resume().id(),
                request.conversationId(),
                request.message()
            );

            String systemPrompt = buildSystemPrompt(request.resume());
            AiInvocationRequest invocationRequest = new AiInvocationRequest(
                systemPrompt,
                request.message(),
                conversationId
            );

            return aiChatService.stream(invocationRequest)
                .flatMap(event -> {
                    if ("message".equals(event.type())) {
                        return emitCharacters(event.content(), conversationId);
                    }
                    return Flux.just(event);
                });
        })
        .onErrorResume(exception -> Flux.just(
            new AiChatEvent("error", streamErrorMessage(exception), request.conversationId()),
            new AiChatEvent("done", "", request.conversationId())
        ));
    }

    private Flux<AiChatEvent> emitCharacters(String content, String conversationId) {
        return Flux.fromIterable(splitCharacters(content))
            .delayElements(CHARACTER_STREAM_DELAY)
            .map(character -> new AiChatEvent("message", character, conversationId));
    }

    private List<String> splitCharacters(String content) {
        return content.codePoints()
            .mapToObj(codePoint -> new String(Character.toChars(codePoint)))
            .toList();
    }

    private String buildSystemPrompt(AiResumeContext resume) {
        return """
            %s

            Bound resume JSON:
            %s
            """.formatted(CHAT_SYSTEM_PROMPT, toJson(resume));
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to serialize AI request context");
        }
    }

    private String streamErrorMessage(Throwable exception) {
        if (exception instanceof AppException appException) {
            return appException.getMessage();
        }
        return exception.getMessage() == null ? "AI stream failed" : exception.getMessage();
    }
}
