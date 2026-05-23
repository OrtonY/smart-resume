package com.smartresume.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartresume.ai.dto.AiDtos.AiChatEvent;
import com.smartresume.ai.dto.AiDtos.AiChatRequest;
import com.smartresume.ai.dto.AiDtos.AiResumeContext;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.resume.service.ResumeService;
import com.smartresume.resume.dto.ResumeDtos.CertificateItem;
import com.smartresume.resume.dto.ResumeDtos.EducationItem;
import com.smartresume.resume.dto.ResumeDtos.HonorItem;
import com.smartresume.resume.dto.ResumeDtos.PersonalInfo;
import com.smartresume.resume.dto.ResumeDtos.ProjectExperienceItem;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeLayoutPayload;
import com.smartresume.resume.dto.ResumeDtos.SkillItem;
import com.smartresume.resume.dto.ResumeDtos.WorkExperienceItem;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Flux;

@ExtendWith(MockitoExtension.class)
class AiAgentServiceTest {

    @Mock
    private AiChatService aiChatService;

    @Mock
    private AiChatHistoryService aiChatHistoryService;

    @Mock
    private ResumeService resumeService;

    private AiAgentService aiAgentService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        aiAgentService = new AiAgentService(aiChatService, aiChatHistoryService, resumeService, objectMapper);
        when(aiChatHistoryService.resolveConversationId(anyString(), any(), anyString()))
            .thenReturn("conv-test-1");
    }

    /**
     * Scenario 1: Out-of-scope question.
     * AI politely declines and steers back to resume topic; produces no suggestions.
     */
    @Test
    void outOfScopeQuestionEmitsEmptySuggestionList() {
        String aiOutput = "这个问题超出了我的能力范围，我专注于帮你优化简历。有什么简历相关的问题我可以帮你吗？\n"
            + "<<<SUGGESTIONS_JSON>>>{\"suggestions\":[]}";

        when(aiChatService.stream(any(AiInvocationRequest.class)))
            .thenReturn(Flux.just(new AiChatEvent("message", aiOutput, "conv-test-1")));

        AiChatRequest request = new AiChatRequest("今天天气怎么样？", null, sampleResumeContext());
        List<AiChatEvent> events = aiAgentService.streamChat(request).collectList().block();

        assertThat(events).isNotNull();
        AiChatEvent suggestionEvent = findEvent(events, "suggestion");
        assertThat(suggestionEvent).isNotNull();
        JsonNode plan = readJson(suggestionEvent.content());
        assertThat(plan.get("suggestions").size()).isEqualTo(0);

        String visibleText = collectMessageText(events);
        assertThat(visibleText).contains("简历");
        assertThat(visibleText).doesNotContain("<<<SUGGESTIONS_JSON>>>");
        assertThat(findEvent(events, "done")).isNotNull();
    }

    /**
     * Scenario 2: Default diagnostic.
     * "Help me review my resume" → at least one suggestion with concise non-blank suggestedValue.
     */
    @Test
    void defaultDiagnosticReturnsConciseSuggestions() {
        String aiOutput = "我看到几个可改进点：\n"
            + "1. 个人总结不够聚焦\n"
            + "2. 工作经历缺少量化数据\n"
            + "<<<SUGGESTIONS_JSON>>>{\"suggestions\":["
            + "{\"id\":\"s1\",\"section\":\"personalSummary\",\"field\":\"value\","
            + "\"currentValue\":\"七年后端开发经验\","
            + "\"suggestedValue\":\"7 年 Spring Boot 后端工程师，专注平台工程与高并发交付\","
            + "\"rationale\":\"加入技术栈与方向更聚焦\"},"
            + "{\"id\":\"s2\",\"section\":\"workExperience\",\"index\":0,\"field\":\"description\","
            + "\"suggestedValue\":\"主导核心 API 重构，QPS 提升 40%\","
            + "\"rationale\":\"补充量化结果\"}"
            + "]}";

        when(aiChatService.stream(any(AiInvocationRequest.class)))
            .thenReturn(Flux.just(new AiChatEvent("message", aiOutput, "conv-test-1")));

        AiChatRequest request = new AiChatRequest("帮我看看简历", null, sampleResumeContext());
        List<AiChatEvent> events = aiAgentService.streamChat(request).collectList().block();

        assertThat(events).isNotNull();
        AiChatEvent suggestionEvent = findEvent(events, "suggestion");
        assertThat(suggestionEvent).isNotNull();
        JsonNode plan = readJson(suggestionEvent.content());
        assertThat(plan.get("suggestions").size()).isGreaterThanOrEqualTo(1);
        for (JsonNode suggestion : plan.get("suggestions")) {
            String suggestedValue = suggestion.get("suggestedValue").asText();
            assertThat(suggestedValue).isNotBlank();
            // Concise: each suggestedValue should be a single short line, not a multi-paragraph rewrite
            assertThat(suggestedValue.length()).isLessThanOrEqualTo(200);
        }

        String visibleText = collectMessageText(events);
        assertThat(visibleText).doesNotContain("<<<SUGGESTIONS_JSON>>>");
        assertThat(visibleText).contains("可改进点");
    }

    /**
     * Scenario 3: Explicit follow-up for detailed rewrite.
     * Output may have a longer suggestedValue or multiple candidates.
     */
    @Test
    void detailedRewriteRequestProducesLongerOrMultiCandidateValues() {
        String longRewrite = "在 2023-2024 年间主导评分平台重构，"
            + "迁移核心打分流程到 Spring Boot 微服务，QPS 从 200 提升至 1200，"
            + "P99 延迟下降 65%，同时建立完善的可观测性体系，"
            + "包括分布式追踪、指标采集与告警，团队交付效率提升约 40%。";

        String aiOutput = "为你详细改写第 2 条建议：\n"
            + "<<<SUGGESTIONS_JSON>>>{\"suggestions\":["
            + "{\"id\":\"s2\",\"section\":\"workExperience\",\"index\":0,\"field\":\"description\","
            + "\"suggestedValue\":\"" + longRewrite + "\","
            + "\"rationale\":\"按用户要求展开为详细版本\"}"
            + "]}";

        when(aiChatService.stream(any(AiInvocationRequest.class)))
            .thenReturn(Flux.just(new AiChatEvent("message", aiOutput, "conv-test-1")));

        AiChatRequest request = new AiChatRequest("第 2 条帮我写长一点", null, sampleResumeContext());
        List<AiChatEvent> events = aiAgentService.streamChat(request).collectList().block();

        assertThat(events).isNotNull();
        AiChatEvent suggestionEvent = findEvent(events, "suggestion");
        assertThat(suggestionEvent).isNotNull();
        JsonNode plan = readJson(suggestionEvent.content());
        assertThat(plan.get("suggestions").size()).isGreaterThanOrEqualTo(1);
        String suggestedValue = plan.get("suggestions").get(0).get("suggestedValue").asText();
        assertThat(suggestedValue.length()).isGreaterThan(80);
    }

    /**
     * Scenario 4: Sentinel fallback.
     * Mock model output with malformed/missing JSON → service does not throw, emits empty suggestion list.
     */
    @Test
    void malformedSentinelJsonFallsBackToEmptyList() {
        String aiOutput = "我已分析完成。\n<<<SUGGESTIONS_JSON>>>{this is not json";

        when(aiChatService.stream(any(AiInvocationRequest.class)))
            .thenReturn(Flux.just(new AiChatEvent("message", aiOutput, "conv-test-1")));

        AiChatRequest request = new AiChatRequest("帮我看看简历", null, sampleResumeContext());
        List<AiChatEvent> events = aiAgentService.streamChat(request).collectList().block();

        assertThat(events).isNotNull();
        AiChatEvent suggestionEvent = findEvent(events, "suggestion");
        assertThat(suggestionEvent).isNotNull();
        JsonNode plan = readJson(suggestionEvent.content());
        assertThat(plan.get("suggestions").size()).isEqualTo(0);
        // Visible text should not include the malformed JSON tail
        String visibleText = collectMessageText(events);
        assertThat(visibleText).doesNotContain("<<<SUGGESTIONS_JSON>>>");
        assertThat(visibleText).doesNotContain("this is not json");
        assertThat(findEvent(events, "done")).isNotNull();
    }

    /**
     * Sentinel-missing fallback: AI omits the sentinel entirely.
     */
    @Test
    void missingSentinelFallsBackToEmptyList() {
        String aiOutput = "这是一段没有哨兵的回答。";

        when(aiChatService.stream(any(AiInvocationRequest.class)))
            .thenReturn(Flux.just(new AiChatEvent("message", aiOutput, "conv-test-1")));

        AiChatRequest request = new AiChatRequest("你是谁？", null, sampleResumeContext());
        List<AiChatEvent> events = aiAgentService.streamChat(request).collectList().block();

        assertThat(events).isNotNull();
        AiChatEvent suggestionEvent = findEvent(events, "suggestion");
        assertThat(suggestionEvent).isNotNull();
        JsonNode plan = readJson(suggestionEvent.content());
        assertThat(plan.get("suggestions").size()).isEqualTo(0);
        assertThat(findEvent(events, "done")).isNotNull();
    }

    /**
     * Bug fix: assistant text persisted to chat memory must NOT carry the raw
     * {@code <<<SUGGESTIONS_JSON>>>{...}} sentinel block. Otherwise history reads and the
     * next prompt replay leak the JSON to the user / pollute model attention.
     *
     * The agent must pass a non-null {@code persistenceSanitizer} on the {@code AiInvocationRequest}
     * it hands to {@code AiChatService.stream(...)}, and applying that sanitizer to a sample
     * sentinel-laden output must yield only the visible diagnostic text.
     */
    @Test
    void invocationRequestCarriesSentinelStrippingPersistenceSanitizer() {
        when(aiChatService.stream(any(AiInvocationRequest.class)))
            .thenReturn(Flux.just(new AiChatEvent(
                "message",
                "诊断文本\n<<<SUGGESTIONS_JSON>>>{\"suggestions\":[]}",
                "conv-test-1"
            )));

        AiChatRequest request = new AiChatRequest("帮我看看简历", null, sampleResumeContext());
        aiAgentService.streamChat(request).collectList().block();

        ArgumentCaptor<AiInvocationRequest> captor = ArgumentCaptor.forClass(AiInvocationRequest.class);
        verify(aiChatService).stream(captor.capture());
        AiInvocationRequest captured = captor.getValue();

        assertThat(captured.persistenceSanitizer()).isNotNull();
        String sanitized = captured.persistenceSanitizer()
            .apply("诊断文本\n\n<<<SUGGESTIONS_JSON>>>{\"suggestions\":[]}");
        assertThat(sanitized).isEqualTo("诊断文本");

        // And exposing the helper directly for sanity.
        assertThat(AiAgentService.stripSuggestionSentinel(
            "诊断文本\n\n<<<SUGGESTIONS_JSON>>>{\"suggestions\":[]}"
        )).isEqualTo("诊断文本");
    }

    /**
     * Scenario 6: Upstream error event passthrough.
     * When AiChatService.stream() emits a message followed by an error event,
     * the error event must be forwarded to the client and no accumulated text should follow.
     */
    @Test
    void upstreamErrorEventIsForwardedAndTextSuppressed() {
        when(aiChatService.stream(any(AiInvocationRequest.class)))
            .thenReturn(Flux.just(
                new AiChatEvent("message", "部分文本", "conv-test-1"),
                new AiChatEvent("error", "upstream failure", "conv-test-1")
            ));

        AiChatRequest request = new AiChatRequest("帮我看看简历", null, sampleResumeContext());
        List<AiChatEvent> events = aiAgentService.streamChat(request).collectList().block();

        assertThat(events).isNotNull();

        // Must contain the error event with original content
        AiChatEvent errorEvent = findEvent(events, "error");
        assertThat(errorEvent).isNotNull();
        assertThat(errorEvent.content()).isEqualTo("upstream failure");

        // Must NOT contain any message characters (the partial text should be suppressed)
        String visibleText = collectMessageText(events);
        assertThat(visibleText).isEmpty();

        // Must NOT contain a suggestion event (error path skips suggestion)
        AiChatEvent suggestionEvent = findEvent(events, "suggestion");
        assertThat(suggestionEvent).isNull();

        // Must end with done
        AiChatEvent doneEvent = findEvent(events, "done");
        assertThat(doneEvent).isNotNull();
    }

    // --- helpers ---

    private AiChatEvent findEvent(List<AiChatEvent> events, String type) {
        return events.stream()
            .filter(event -> type.equals(event.type()))
            .findFirst()
            .orElse(null);
    }

    private String collectMessageText(List<AiChatEvent> events) {
        StringBuilder sb = new StringBuilder();
        for (AiChatEvent event : events) {
            if ("message".equals(event.type())) {
                sb.append(event.content());
            }
        }
        return sb.toString();
    }

    private JsonNode readJson(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private AiResumeContext sampleResumeContext() {
        return new AiResumeContext(
            "resume-1",
            "Senior Engineer Resume",
            "classic",
            new ResumeContentPayload(
                new PersonalInfo(
                    "Alex Chen", "Senior Backend Engineer", "13800000000",
                    "alex@example.com", "Shanghai", "https://alex.dev",
                    "35k-45k", "30", ""
                ),
                "Seven years of backend development experience.",
                List.of(new EducationItem("Example University", "Bachelor", "CS", "2012", "2016", "")),
                List.of(new WorkExperienceItem("Example Corp", "Backend Engineer", "2020", "2024", "Built services.")),
                List.of(new ProjectExperienceItem("Scoring Platform", "Tech Lead", "2023", "2024", "Led refactor.")),
                List.of(new SkillItem("Java", "Expert")),
                List.of(new HonorItem("Top Performer", "Example Corp", "2024", "")),
                List.of(new CertificateItem("AWS SAA", "AWS", "2024", "aws-saa"))
            ),
            new ResumeLayoutPayload(
                List.of("education", "summary", "workExperience", "projectExperience", "skills", "honors", "certificates"),
                List.of()
            )
        );
    }
}
