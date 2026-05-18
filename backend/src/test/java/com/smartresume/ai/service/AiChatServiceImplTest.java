package com.smartresume.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartresume.ai.domain.AiConfigurationEntity;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.ai.provider.ChatModelProvider;
import com.smartresume.ai.provider.ChatModelProviderRegistry;
import com.smartresume.common.exception.AppException;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.memory.repository.jdbc.JdbcChatMemoryRepository;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.prompt.Prompt;
import reactor.core.publisher.Flux;
import reactor.test.StepVerifier;

@ExtendWith(MockitoExtension.class)
class AiChatServiceImplTest {

    @Mock
    private AiConfigurationService aiConfigurationService;

    @Mock
    private JdbcChatMemoryRepository chatMemoryRepository;

    @Mock
    private ChatModelProviderRegistry chatModelProviderRegistry;

    @Mock
    private ChatModelProvider chatModelProvider;

    @Mock
    private ChatModel chatModel;

    private AiChatServiceImpl aiChatService;

    private final AiConfigurationEntity configuration = createConfiguration();

    @BeforeEach
    void setUp() {
        aiChatService = new AiChatServiceImpl(
            aiConfigurationService,
            chatMemoryRepository,
            chatModelProviderRegistry
        );
    }

    // --- stream() tests ---

    @Test
    void streamReturnsCharacterEventsAndDone() {
        stubChatModel();

        when(chatModel.stream(any(Prompt.class))).thenReturn(
            Flux.just(chatResponse("Hello"))
        );

        AiInvocationRequest request = new AiInvocationRequest(
            "You are a test assistant.",
            "Hi",
            "conv-stream-1"
        );

        StepVerifier.create(aiChatService.stream(request))
            .assertNext(event -> {
                assertThat(event.type()).isEqualTo("message");
                assertThat(event.content()).isEqualTo("Hello");
                assertThat(event.conversationId()).isEqualTo("conv-stream-1");
            })
            .assertNext(event -> {
                assertThat(event.type()).isEqualTo("done");
                assertThat(event.content()).isEmpty();
            })
            .verifyComplete();
    }

    @Test
    void streamFallsBackToSyncCallWhenStreamEmpty() {
        stubChatModel();

        when(chatModel.stream(any(Prompt.class))).thenReturn(Flux.empty());
        when(chatModel.call(any(Prompt.class))).thenReturn(chatResponse("Fallback content"));

        AiInvocationRequest request = new AiInvocationRequest(
            "You are a test assistant.",
            "Hi",
            "conv-stream-fallback"
        );

        StepVerifier.create(aiChatService.stream(request))
            .assertNext(event -> {
                assertThat(event.type()).isEqualTo("message");
                assertThat(event.content()).isEqualTo("Fallback content");
            })
            .assertNext(event -> assertThat(event.type()).isEqualTo("done"))
            .verifyComplete();
    }

    @Test
    void streamReturnsErrorWhenBothStreamAndCallReturnEmpty() {
        stubChatModel();

        when(chatModel.stream(any(Prompt.class))).thenReturn(Flux.empty());
        when(chatModel.call(any(Prompt.class))).thenReturn(chatResponse(""));

        AiInvocationRequest request = new AiInvocationRequest(
            "You are a test assistant.",
            "Hi",
            "conv-stream-empty"
        );

        StepVerifier.create(aiChatService.stream(request))
            .assertNext(event -> assertThat(event.type()).isEqualTo("error"))
            .assertNext(event -> assertThat(event.type()).isEqualTo("done"))
            .verifyComplete();
    }

    @Test
    void streamAppliesPersistenceSanitizerBeforeWritingMemory() {
        stubChatModel();

        String rawOutput = "诊断文本\n\n<<<SUGGESTIONS_JSON>>>{\"suggestions\":[]}";
        when(chatModel.stream(any(Prompt.class))).thenReturn(
            Flux.just(chatResponse(rawOutput))
        );

        AiInvocationRequest request = new AiInvocationRequest(
            "You are a test assistant.",
            "Hi",
            "conv-sanitizer-1",
            text -> {
                int idx = text.indexOf("<<<SUGGESTIONS_JSON>>>");
                return idx < 0 ? text : text.substring(0, idx).stripTrailing();
            }
        );

        StepVerifier.create(aiChatService.stream(request))
            .assertNext(event -> {
                assertThat(event.type()).isEqualTo("message");
                assertThat(event.content()).isEqualTo(rawOutput);
            })
            .assertNext(event -> assertThat(event.type()).isEqualTo("done"))
            .verifyComplete();

        // Verify that chatMemoryRepository.saveAll was called and the persisted messages
        // do NOT contain the sentinel. MessageWindowChatMemory calls saveAll with the
        // full windowed message list including the sanitized assistant message.
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Message>> messagesCaptor = ArgumentCaptor.forClass(List.class);
        verify(chatMemoryRepository, atLeast(1)).saveAll(eq("conv-sanitizer-1"), messagesCaptor.capture());

        // The last saveAll invocation should contain the assistant message without sentinel.
        List<List<Message>> allCalls = messagesCaptor.getAllValues();
        List<Message> lastSaved = allCalls.get(allCalls.size() - 1);
        boolean hasAssistantWithoutSentinel = lastSaved.stream()
            .filter(m -> m instanceof AssistantMessage)
            .map(Message::getText)
            .anyMatch(text -> !text.contains("<<<SUGGESTIONS_JSON>>>"));
        assertThat(hasAssistantWithoutSentinel)
            .as("Persisted assistant message must not contain the sentinel")
            .isTrue();
    }

    // --- call() tests ---

    @Test
    void callReturnsContentString() {
        stubChatModel();

        when(chatModel.call(any(Prompt.class))).thenReturn(chatResponse("Sync response"));

        AiInvocationRequest request = new AiInvocationRequest(
            "You are a test assistant.",
            "Tell me something",
            "conv-call-1"
        );

        String result = aiChatService.call(request);

        assertThat(result).isEqualTo("Sync response");
    }

    @Test
    void callThrowsOnEmptyResponse() {
        stubChatModel();

        when(chatModel.call(any(Prompt.class))).thenReturn(chatResponse(""));

        AiInvocationRequest request = new AiInvocationRequest(
            "You are a test assistant.",
            "Tell me something",
            "conv-call-empty"
        );

        assertThatThrownBy(() -> aiChatService.call(request))
            .isInstanceOf(AppException.class)
            .hasMessageContaining("empty response");
    }

    @Test
    void callThrowsOnNullResponse() {
        stubChatModel();

        when(chatModel.call(any(Prompt.class))).thenReturn(null);

        AiInvocationRequest request = new AiInvocationRequest(
            "You are a test assistant.",
            "Tell me something",
            "conv-call-null"
        );

        assertThatThrownBy(() -> aiChatService.call(request))
            .isInstanceOf(AppException.class)
            .hasMessageContaining("empty response");
    }

    // --- callStructured() tests ---

    @Test
    void callStructuredParsesValidJson() {
        stubChatModel();

        String json = """
            {"name":"Alice","age":30}
            """;
        when(chatModel.call(any(Prompt.class))).thenReturn(chatResponse(json));

        AiInvocationRequest request = new AiInvocationRequest(
            "Return JSON.",
            "Give me a person",
            "conv-struct-1"
        );

        SimplePerson result = aiChatService.callStructured(request, SimplePerson.class);

        assertThat(result.name()).isEqualTo("Alice");
        assertThat(result.age()).isEqualTo(30);
    }

    @Test
    void callStructuredRetriesOnceOnParseFailure() {
        stubChatModel();

        // First call returns invalid JSON, second returns valid
        when(chatModel.call(any(Prompt.class)))
            .thenReturn(chatResponse("not valid json"))
            .thenReturn(chatResponse("{\"name\":\"Bob\",\"age\":25}"));

        AiInvocationRequest request = new AiInvocationRequest(
            "Return JSON.",
            "Give me a person",
            "conv-struct-retry"
        );

        SimplePerson result = aiChatService.callStructured(request, SimplePerson.class);

        assertThat(result.name()).isEqualTo("Bob");
        assertThat(result.age()).isEqualTo(25);
    }

    @Test
    void callStructuredThrowsAfterAllRetriesExhausted() {
        stubChatModel();

        when(chatModel.call(any(Prompt.class)))
            .thenReturn(chatResponse("bad json 1"))
            .thenReturn(chatResponse("bad json 2"));

        AiInvocationRequest request = new AiInvocationRequest(
            "Return JSON.",
            "Give me a person",
            "conv-struct-fail"
        );

        assertThatThrownBy(() -> aiChatService.callStructured(request, SimplePerson.class))
            .isInstanceOf(AppException.class)
            .hasMessageContaining("Failed to parse AI response");
    }

    // --- helper methods ---

    private void stubChatModel() {
        when(aiConfigurationService.requireConfiguration()).thenReturn(configuration);
        when(chatModelProviderRegistry.findProvider("OpenAI")).thenReturn(Optional.of(chatModelProvider));
        when(chatModelProvider.createChatModel(configuration)).thenReturn(chatModel);
    }

    private ChatResponse chatResponse(String text) {
        return new ChatResponse(List.of(new Generation(new AssistantMessage(text))));
    }

    private AiConfigurationEntity createConfiguration() {
        AiConfigurationEntity config = new AiConfigurationEntity();
        config.setId(1L);
        config.setVendor("OpenAI");
        config.setBaseUrl("http://localhost:11434");
        config.setApiKey("test-key");
        config.setModelName("test-model");
        return config;
    }

    private record SimplePerson(String name, int age) {}
}
