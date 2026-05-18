package com.smartresume.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartresume.ai.dto.AiDtos.AiChatEvent;
import com.smartresume.ai.dto.AiDtos.AiChatRequest;
import com.smartresume.ai.dto.AiDtos.AiResumeContext;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.ai.dto.suggestion.AiResumeSuggestionPlan;
import com.smartresume.common.exception.AppException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.List;

@Service
public class AiAgentService {

    private static final Logger log = LoggerFactory.getLogger(AiAgentService.class);

    private static final Duration CHARACTER_STREAM_DELAY = Duration.ofMillis(12);
    private static final String SUGGESTIONS_SENTINEL = "<<<SUGGESTIONS_JSON>>>";
    private static final String EMPTY_SUGGESTIONS_JSON = "{\"suggestions\":[]}";

    private static final String CHAT_SYSTEM_PROMPT = """
        你是「智慧简历 AI」，一个专业的简历优化助手。

        ## 身份
        当用户问你是谁、你能做什么时，回答：我是智慧简历 AI，专注于帮助你优化当前简历的内容与表达。

        ## 范围约束
        - 允许回答：当前简历内容相关问题、简历中出现过的公司/项目/岗位/行业相关问题、简历优化建议、面试相关常识。
        - 拒答：与简历无关的闲聊、通用编程问题、生活咨询等。
        - 越界时回复：「这个问题超出了我的能力范围，我专注于帮你优化简历。有什么简历相关的问题我可以帮你吗？」不要破坏对话上下文。

        ## 默认输出行为
        当发现简历可改进点时：
        1. 先输出人类可读的诊断说明（markdown 格式），逐条列出「问题 + 一句话理由」。
        2. suggestedValue 默认为可一键应用的简洁新文本（一句话或短语），不要主动展开长段重写。
        3. 仅当用户显式说「帮我写长一点」「多给几个版本」「详细改」时，才输出更长版本或多候选。

        ## 哨兵规约
        在可读文本全部输出完毕后，**单独一行**输出哨兵标记和 JSON：
        <<<SUGGESTIONS_JSON>>>{"suggestions":[...], "summary":"可选总结"}

        JSON 结构要求：
        - suggestions 数组中每个对象：
          - id: 唯一标识（UUID 格式）
          - section: 枚举值（personalInfo / personalSummary / education / workExperience / projectExperience / skills / honors / certificates）
          - index: 数组型 section 必填（从 0 开始），标量 section（personalSummary）省略
          - field: 该 section 下的合法字段名；personalSummary 的 field 固定为 "value"
          - currentValue: 现状摘要（可选）
          - suggestedValue: 可一键应用的新文本（必填）
          - rationale: 一句话理由（必填）
        - 无可建议时输出：<<<SUGGESTIONS_JSON>>>{"suggestions":[]}
        - 哨兵不要嵌入正文中段，必须在所有可读文本之后。

        ## 多轮 dismissed 约定
        如果用户消息末尾包含 [系统提示：用户在上一轮主动跳过了以下建议...] 块，不要再重复推荐相同字段的相同改法。

        ## 语言
        默认使用中文，除非用户明确要求其他语言。
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
                conversationId,
                AiAgentService::stripSuggestionSentinel
            );

            // Approach B: collect full upstream text, strip sentinel, then emit characters + suggestion event.
            // If an upstream error event arrives, forward it immediately and skip the text pipeline.
            return aiChatService.stream(invocationRequest)
                .collectList()
                .flatMapMany(events -> {
                    // Check if upstream emitted an error event
                    AiChatEvent errorEvent = events.stream()
                        .filter(e -> "error".equals(e.type()))
                        .findFirst()
                        .orElse(null);

                    if (errorEvent != null) {
                        // Forward the error event and done; do not emit accumulated text
                        return Flux.just(
                            errorEvent,
                            new AiChatEvent("done", "", conversationId)
                        );
                    }

                    // Normal path: reduce message events to full text
                    String fullText = events.stream()
                        .filter(e -> "message".equals(e.type()))
                        .map(AiChatEvent::content)
                        .reduce(new StringBuilder(), StringBuilder::append, StringBuilder::append)
                        .toString();

                    return buildResponseFlux(fullText, conversationId);
                });
        })
        .onErrorResume(exception -> Flux.just(
            new AiChatEvent("error", streamErrorMessage(exception), request.conversationId()),
            new AiChatEvent("done", "", request.conversationId())
        ));
    }

    private Flux<AiChatEvent> buildResponseFlux(String fullText, String conversationId) {
        String visibleText = stripSuggestionSentinel(fullText);
        String suggestionJson;

        int sentinelIndex = fullText.indexOf(SUGGESTIONS_SENTINEL);
        if (sentinelIndex >= 0) {
            String rawJson = fullText.substring(sentinelIndex + SUGGESTIONS_SENTINEL.length()).strip();
            suggestionJson = parseSuggestionJson(rawJson, conversationId);
        } else {
            log.warn("No suggestion sentinel found in AI response (conversationId={})", conversationId);
            suggestionJson = EMPTY_SUGGESTIONS_JSON;
        }

        Flux<AiChatEvent> textFlux;
        if (visibleText.isEmpty()) {
            textFlux = Flux.empty();
        } else {
            textFlux = emitCharacters(visibleText, conversationId);
        }

        AiChatEvent suggestionEvent = new AiChatEvent("suggestion", suggestionJson, conversationId);
        AiChatEvent doneEvent = new AiChatEvent("done", "", conversationId);

        return textFlux.concatWithValues(suggestionEvent, doneEvent);
    }

    /**
     * Strips the trailing {@code <<<SUGGESTIONS_JSON>>>{...}} sentinel block from an AI response.
     * Used both when emitting the visible stream to the client and when sanitizing assistant
     * messages before they are persisted to chat memory, so subsequent prompts replayed by
     * {@code MessageChatMemoryAdvisor} never carry the raw sentinel.
     */
    static String stripSuggestionSentinel(String fullText) {
        if (fullText == null) {
            return "";
        }
        int sentinelIndex = fullText.indexOf(SUGGESTIONS_SENTINEL);
        if (sentinelIndex < 0) {
            return fullText;
        }
        return fullText.substring(0, sentinelIndex).stripTrailing();
    }

    private String parseSuggestionJson(String rawJson, String conversationId) {
        try {
            // Validate it's parseable as AiResumeSuggestionPlan
            objectMapper.readValue(rawJson, AiResumeSuggestionPlan.class);
            return rawJson;
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse suggestion JSON (conversationId={}): {}", conversationId, e.getMessage());
            return EMPTY_SUGGESTIONS_JSON;
        }
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
