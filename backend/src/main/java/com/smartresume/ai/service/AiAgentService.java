package com.smartresume.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartresume.ai.domain.AiConfigurationEntity;
import com.smartresume.ai.dto.AiDtos.AiChatEvent;
import com.smartresume.ai.dto.AiDtos.AiChatRequest;
import com.smartresume.ai.dto.AiDtos.AiResumeContext;
import com.smartresume.ai.provider.ChatModelProvider;
import com.smartresume.ai.provider.ChatModelProviderRegistry;
import com.smartresume.common.exception.AppException;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.ai.chat.memory.repository.jdbc.JdbcChatMemoryRepository;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
public class AiAgentService {

    private static final int MAX_MEMORY_MESSAGES = 20;
    private static final Duration CHARACTER_STREAM_DELAY = Duration.ofMillis(12);
    private static final String CHAT_SYSTEM_PROMPT = """
        You are a resume editing assistant.
        Answer based on the bound resume JSON context and the conversation memory.
        Do not invent facts that are not present in the resume.
        If the user asks for changes, give clear suggestions in chat. Do not modify data directly.
        Default to Chinese unless the user explicitly requests another language.
        """;

    private final AiConfigurationService aiConfigurationService;
    private final AiChatHistoryService aiChatHistoryService;
    private final JdbcChatMemoryRepository chatMemoryRepository;
    private final ChatModelProviderRegistry chatModelProviderRegistry;
    private final ObjectMapper objectMapper;

    public AiAgentService(
        AiConfigurationService aiConfigurationService,
        AiChatHistoryService aiChatHistoryService,
        JdbcChatMemoryRepository chatMemoryRepository,
        ChatModelProviderRegistry chatModelProviderRegistry,
        ObjectMapper objectMapper
    ) {
        this.aiConfigurationService = aiConfigurationService;
        this.aiChatHistoryService = aiChatHistoryService;
        this.chatMemoryRepository = chatMemoryRepository;
        this.chatModelProviderRegistry = chatModelProviderRegistry;
        this.objectMapper = objectMapper;
    }

    public Flux<AiChatEvent> streamChat(AiChatRequest request) {
        return Flux.defer(() -> {
            AiConfigurationEntity configuration = aiConfigurationService.requireConfiguration();
            String conversationId = aiChatHistoryService.resolveConversationId(
                request.resume().id(),
                request.conversationId(),
                request.message()
            );
            ChatModel chatModel = createChatModel(configuration);
            ChatMemory chatMemory = createChatMemory();
            Prompt prompt = createPrompt(chatMemory, conversationId, request);
            StringBuilder assistantText = new StringBuilder();

            return streamPrompt(chatModel, prompt, conversationId, assistantText)
                .switchIfEmpty(fallbackCallPrompt(chatModel, prompt, conversationId, assistantText))
                .doOnComplete(() -> saveAssistantMessage(chatMemory, conversationId, assistantText))
                .concatWithValues(new AiChatEvent("done", "", conversationId));
            })
            .onErrorResume(exception -> Flux.just(
                new AiChatEvent("error", streamErrorMessage(exception), request.conversationId()),
                new AiChatEvent("done", "", request.conversationId())
            ));
    }

    private ChatMemory createChatMemory() {
        return MessageWindowChatMemory.builder()
            .chatMemoryRepository(chatMemoryRepository)
            .maxMessages(MAX_MEMORY_MESSAGES)
            .build();
    }

    private Prompt createPrompt(ChatMemory chatMemory, String conversationId, AiChatRequest request) {
        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(buildSystemPrompt(request.resume())));
        messages.addAll(chatMemory.get(conversationId));
        UserMessage userMessage = new UserMessage(request.message());
        messages.add(userMessage);

        chatMemory.add(conversationId, userMessage);
        return new Prompt(messages);
    }

    private Flux<AiChatEvent> streamPrompt(
        ChatModel chatModel,
        Prompt prompt,
        String conversationId,
        StringBuilder assistantText
    ) {
        return chatModel.stream(prompt)
            .map(this::extractContent)
            .filter(content -> content != null && !content.isBlank())
            .concatMap(content -> emitCharacters(content, conversationId, assistantText))
            .onErrorResume(exception -> fallbackCallPrompt(chatModel, prompt, conversationId, assistantText));
    }

    private Flux<AiChatEvent> fallbackCallPrompt(
        ChatModel chatModel,
        Prompt prompt,
        String conversationId,
        StringBuilder assistantText
    ) {
        return Mono.fromCallable(() -> extractContent(chatModel.call(prompt)))
            .subscribeOn(Schedulers.boundedElastic())
            .flatMapMany(content -> {
                if (content == null || content.isBlank()) {
                    return Flux.just(new AiChatEvent(
                        "error",
                        "AI provider returned an empty response. Check the configured Base URL, model name, and whether the provider supports OpenAI-compatible chat completions.",
                        conversationId
                    ));
                }
                return emitCharacters(content, conversationId, assistantText);
            });
    }

    private Flux<AiChatEvent> emitCharacters(String content, String conversationId, StringBuilder assistantText) {
        assistantText.append(content);
        return Flux.fromIterable(splitCharacters(content))
            .delayElements(CHARACTER_STREAM_DELAY)
            .map(character -> new AiChatEvent("message", character, conversationId));
    }

    private List<String> splitCharacters(String content) {
        return content.codePoints()
            .mapToObj(codePoint -> new String(Character.toChars(codePoint)))
            .toList();
    }

    private String extractContent(ChatResponse response) {
        if (response == null || response.getResult() == null || response.getResult().getOutput() == null) {
            return "";
        }
        return response.getResult().getOutput().getText();
    }

    private void saveAssistantMessage(ChatMemory chatMemory, String conversationId, StringBuilder assistantText) {
        if (!assistantText.isEmpty()) {
            chatMemory.add(conversationId, new AssistantMessage(assistantText.toString()));
        }
    }

    private ChatModel createChatModel(AiConfigurationEntity configuration) {
        String vendor = configuration.getVendor();
        ChatModelProvider provider = chatModelProviderRegistry.findProvider(vendor)
            .orElseGet(() -> chatModelProviderRegistry.findProvider("OpenAI")
                .orElseThrow(() -> new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "No AI provider available")));
        return provider.createChatModel(configuration);
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
