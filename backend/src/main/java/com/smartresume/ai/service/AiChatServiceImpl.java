package com.smartresume.ai.service;

import com.smartresume.ai.domain.AiConfigurationEntity;
import com.smartresume.ai.dto.AiDtos.AiChatEvent;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.ai.provider.ChatModelProvider;
import com.smartresume.ai.provider.ChatModelProviderRegistry;
import com.smartresume.common.exception.AppException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.ai.chat.memory.repository.jdbc.JdbcChatMemoryRepository;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.ArrayList;
import java.util.List;

@Service
public class AiChatServiceImpl implements AiChatService {

    private static final Logger log = LoggerFactory.getLogger(AiChatServiceImpl.class);
    private static final int MAX_MEMORY_MESSAGES = 100;
    private static final int MAX_STRUCTURED_RETRIES = 1;

    private final AiConfigurationService aiConfigurationService;
    private final JdbcChatMemoryRepository chatMemoryRepository;
    private final ChatModelProviderRegistry chatModelProviderRegistry;

    public AiChatServiceImpl(
        AiConfigurationService aiConfigurationService,
        JdbcChatMemoryRepository chatMemoryRepository,
        ChatModelProviderRegistry chatModelProviderRegistry
    ) {
        this.aiConfigurationService = aiConfigurationService;
        this.chatMemoryRepository = chatMemoryRepository;
        this.chatModelProviderRegistry = chatModelProviderRegistry;
    }

    @Override
    public Flux<AiChatEvent> stream(AiInvocationRequest request) {
        return Flux.defer(() -> {
            ChatModel chatModel = createChatModel();
            ChatMemory chatMemory = createChatMemory();
            String conversationId = request.conversationId();
            Prompt prompt = buildPromptWithMemory(chatMemory, conversationId, request);
            StringBuilder assistantText = new StringBuilder();

            return chatModel.stream(prompt)
                .map(this::extractContent)
                .filter(content -> content != null && !content.isEmpty())
                .concatMap(content -> {
                    assistantText.append(content);
                    return Flux.just(new AiChatEvent("message", content, conversationId));
                })
                .switchIfEmpty(Mono.fromCallable(() -> extractContent(chatModel.call(prompt)))
                    .subscribeOn(Schedulers.boundedElastic())
                    .flatMapMany(content -> {
                        if (content == null || content.isBlank()) {
                            return Flux.just(new AiChatEvent(
                                "error",
                                "AI provider returned an empty response.",
                                conversationId
                            ));
                        }
                        assistantText.append(content);
                        return Flux.just(new AiChatEvent("message", content, conversationId));
                    })
                )
                .doOnComplete(() -> {
                    if (!assistantText.isEmpty()) {
                        String persisted = sanitizeForPersistence(assistantText.toString(), request);
                        if (persisted != null && !persisted.isEmpty()) {
                            chatMemory.add(conversationId, new AssistantMessage(persisted));
                        }
                    }
                })
                .concatWithValues(new AiChatEvent("done", "", conversationId));
        });
    }

    @Override
    public String call(AiInvocationRequest request) {
        ChatModel chatModel = createChatModel();
        ChatMemory chatMemory = createChatMemory();
        String conversationId = request.conversationId();
        Prompt prompt = buildPromptWithMemory(chatMemory, conversationId, request);

        ChatResponse response = chatModel.call(prompt);
        String content = extractContent(response);

        if (content == null || content.isBlank()) {
            throw AppException.of(HttpStatus.INTERNAL_SERVER_ERROR, "error.ai.providerEmptyResponse");
        }

        String persisted = sanitizeForPersistence(content, request);
        if (persisted != null && !persisted.isEmpty()) {
            chatMemory.add(conversationId, new AssistantMessage(persisted));
        }
        return content;
    }

    private String sanitizeForPersistence(String text, AiInvocationRequest request) {
        if (request.persistenceSanitizer() == null) {
            return text;
        }
        return request.persistenceSanitizer().apply(text);
    }

    @Override
    public <T> T callStructured(AiInvocationRequest request, Class<T> responseType) {
        BeanOutputConverter<T> converter = new BeanOutputConverter<>(responseType);
        String formatInstructions = converter.getFormat();

        String augmentedUserMessage = request.userMessage() + "\n\n" + formatInstructions;
        AiInvocationRequest augmentedRequest = new AiInvocationRequest(
            request.systemPrompt(),
            augmentedUserMessage,
            request.conversationId()
        );

        return callStructuredWithRetry(augmentedRequest, converter, responseType);
    }

    private <T> T callStructuredWithRetry(
        AiInvocationRequest request,
        BeanOutputConverter<T> converter,
        Class<T> responseType
    ) {
        Exception lastException = null;

        for (int attempt = 0; attempt <= MAX_STRUCTURED_RETRIES; attempt++) {
            try {
                String rawResponse = call(request);
                return converter.convert(rawResponse);
            } catch (Exception e) {
                lastException = e;
                log.warn("Structured output parsing failed (attempt {}/{}): {}",
                    attempt + 1, MAX_STRUCTURED_RETRIES + 1, e.getMessage());
            }
        }

        log.error("Structured output parsing failed after all retries for {}", responseType.getSimpleName());
        String detail = responseType.getSimpleName() + ": "
            + (lastException != null ? lastException.getMessage() : "unknown error");
        throw AppException.of(HttpStatus.INTERNAL_SERVER_ERROR, "error.ai.parseFailed", detail);
    }

    private Prompt buildPromptWithMemory(ChatMemory chatMemory, String conversationId, AiInvocationRequest request) {
        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(request.systemPrompt()));
        messages.addAll(chatMemory.get(conversationId));
        UserMessage userMessage = new UserMessage(request.userMessage());
        messages.add(userMessage);
        chatMemory.add(conversationId, userMessage);
        return new Prompt(messages);
    }

    private ChatModel createChatModel() {
        AiConfigurationEntity configuration = aiConfigurationService.requireConfiguration();
        String vendor = configuration.getVendor();
        ChatModelProvider provider = chatModelProviderRegistry.findProvider(vendor)
            .orElseGet(() -> chatModelProviderRegistry.findProvider("OpenAI")
                .orElseThrow(() -> AppException.of(HttpStatus.INTERNAL_SERVER_ERROR, "error.ai.providerUnavailable")));
        return provider.createChatModel(configuration);
    }

    private ChatMemory createChatMemory() {
        return MessageWindowChatMemory.builder()
            .chatMemoryRepository(chatMemoryRepository)
            .maxMessages(MAX_MEMORY_MESSAGES)
            .build();
    }

    private String extractContent(ChatResponse response) {
        if (response == null || response.getResult() == null || response.getResult().getOutput() == null) {
            return "";
        }
        String text = response.getResult().getOutput().getText();
        return text != null ? text : "";
    }
}
