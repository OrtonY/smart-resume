package com.smartresume.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartresume.ai.dto.AiDtos.AiChatEvent;
import com.smartresume.ai.dto.AiDtos.AiChatRequest;
import com.smartresume.ai.dto.AiDtos.AiResumeContext;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.resume.dto.ResumeDtos.CertificateItem;
import com.smartresume.resume.dto.ResumeDtos.EducationItem;
import com.smartresume.resume.dto.ResumeDtos.HonorItem;
import com.smartresume.resume.dto.ResumeDtos.PersonalInfo;
import com.smartresume.resume.dto.ResumeDtos.ProjectExperienceItem;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeLayoutPayload;
import com.smartresume.resume.dto.ResumeDtos.SkillItem;
import com.smartresume.resume.dto.ResumeDtos.WorkExperienceItem;
import com.smartresume.resume.service.ResumeService;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Flux;

@ExtendWith(MockitoExtension.class)
class AiAgentServiceTest {

    private AiChatService aiChatService;
    private AiChatHistoryService aiChatHistoryService;
    private ResumeService resumeService;
    private AiAgentService aiAgentService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        aiChatService = org.mockito.Mockito.mock(AiChatService.class);
        aiChatHistoryService = org.mockito.Mockito.mock(AiChatHistoryService.class);
        resumeService = org.mockito.Mockito.mock(ResumeService.class);

        CurrentUserContext.set(new CurrentUserContext.AuthenticatedUser(7L, "tester", false));

        aiAgentService = new AiAgentService(aiChatService, aiChatHistoryService, resumeService, objectMapper);
        when(aiChatHistoryService.resolveConversationId(anyString(), any(), anyString()))
            .thenReturn("conv-test-1");
        lenient().when(aiChatHistoryService.persistSuggestionPlan(anyString(), anyString(), anyString(), anyLong()))
            .thenAnswer(invocation -> invocation.getArgument(2));
    }

    @AfterEach
    void tearDown() {
        CurrentUserContext.clear();
    }

    @Test
    void outOfScopeQuestionEmitsEmptySuggestionList() {
        String aiOutput = "That question is outside my resume scope.\n"
            + "<<<SUGGESTIONS_JSON>>>{\"suggestions\":[]}";

        when(aiChatService.stream(any(AiInvocationRequest.class)))
            .thenReturn(Flux.just(new AiChatEvent("message", aiOutput, "conv-test-1")));

        AiChatRequest request = new AiChatRequest("What is the weather today?", null, sampleResumeContext());
        List<AiChatEvent> events = aiAgentService.streamChat(request).collectList().block();

        assertThat(events).isNotNull();
        AiChatEvent suggestionEvent = findEvent(events, "suggestion");
        assertThat(suggestionEvent).isNotNull();
        JsonNode plan = readJson(suggestionEvent.content());
        assertThat(plan.get("suggestions").size()).isEqualTo(0);

        String visibleText = collectMessageText(events);
        assertThat(visibleText).contains("outside my resume scope");
        assertThat(visibleText).doesNotContain("<<<SUGGESTIONS_JSON>>>");
        assertThat(findEvent(events, "done")).isNotNull();
    }

    @Test
    void defaultDiagnosticReturnsConciseSuggestions() {
        String aiOutput = "I found a few improvement points.\n"
            + "1. Summary is not focused enough.\n"
            + "2. Work experience lacks metrics.\n"
            + "<<<SUGGESTIONS_JSON>>>{\"suggestions\":["
            + "{\"id\":\"s1\",\"section\":\"personalSummary\",\"field\":\"value\","
            + "\"currentValue\":\"Seven years of backend development.\","
            + "\"suggestedValue\":\"Backend engineer focused on Spring Boot platforms and scalable delivery.\","
            + "\"rationale\":\"Clarifies specialization\"},"
            + "{\"id\":\"s2\",\"section\":\"workExperience\",\"index\":0,\"field\":\"description\","
            + "\"suggestedValue\":\"Led a core API refactor that improved throughput by 40%.\","
            + "\"rationale\":\"Adds measurable impact\"}"
            + "]}";

        when(aiChatService.stream(any(AiInvocationRequest.class)))
            .thenReturn(Flux.just(new AiChatEvent("message", aiOutput, "conv-test-1")));

        AiChatRequest request = new AiChatRequest("Review my resume", null, sampleResumeContext());
        List<AiChatEvent> events = aiAgentService.streamChat(request).collectList().block();

        assertThat(events).isNotNull();
        AiChatEvent suggestionEvent = findEvent(events, "suggestion");
        assertThat(suggestionEvent).isNotNull();
        JsonNode plan = readJson(suggestionEvent.content());
        assertThat(plan.get("suggestions").size()).isGreaterThanOrEqualTo(1);
        for (JsonNode suggestion : plan.get("suggestions")) {
            String suggestedValue = suggestion.get("suggestedValue").asText();
            assertThat(suggestedValue).isNotBlank();
            assertThat(suggestedValue.length()).isLessThanOrEqualTo(200);
        }

        String visibleText = collectMessageText(events);
        assertThat(visibleText).doesNotContain("<<<SUGGESTIONS_JSON>>>");
        assertThat(visibleText).contains("improvement points");
    }

    @Test
    void detailedRewriteRequestProducesLongerSuggestedValue() {
        String longRewrite = "Led the scoring platform refactor from 2023 to 2024, migrated the "
            + "core pipeline to Spring Boot services, improved QPS from 200 to 1200, reduced "
            + "P99 latency by 65%, and established tracing, metrics, and alerting that improved "
            + "team delivery efficiency by 40%.";

        String aiOutput = "Here is a more detailed rewrite.\n"
            + "<<<SUGGESTIONS_JSON>>>{\"suggestions\":["
            + "{\"id\":\"s2\",\"section\":\"workExperience\",\"index\":0,\"field\":\"description\","
            + "\"suggestedValue\":\"" + longRewrite + "\","
            + "\"rationale\":\"Expanded into a detailed version\"}"
            + "]}";

        when(aiChatService.stream(any(AiInvocationRequest.class)))
            .thenReturn(Flux.just(new AiChatEvent("message", aiOutput, "conv-test-1")));

        AiChatRequest request = new AiChatRequest("Make suggestion 2 longer", null, sampleResumeContext());
        List<AiChatEvent> events = aiAgentService.streamChat(request).collectList().block();

        assertThat(events).isNotNull();
        AiChatEvent suggestionEvent = findEvent(events, "suggestion");
        assertThat(suggestionEvent).isNotNull();
        JsonNode plan = readJson(suggestionEvent.content());
        assertThat(plan.get("suggestions").size()).isGreaterThanOrEqualTo(1);
        String suggestedValue = plan.get("suggestions").get(0).get("suggestedValue").asText();
        assertThat(suggestedValue.length()).isGreaterThan(80);
    }

    @Test
    void malformedSentinelJsonFallsBackToEmptyList() {
        String aiOutput = "Analysis complete.\n<<<SUGGESTIONS_JSON>>>{this is not json";

        when(aiChatService.stream(any(AiInvocationRequest.class)))
            .thenReturn(Flux.just(new AiChatEvent("message", aiOutput, "conv-test-1")));

        AiChatRequest request = new AiChatRequest("Review my resume", null, sampleResumeContext());
        List<AiChatEvent> events = aiAgentService.streamChat(request).collectList().block();

        assertThat(events).isNotNull();
        AiChatEvent suggestionEvent = findEvent(events, "suggestion");
        assertThat(suggestionEvent).isNotNull();
        JsonNode plan = readJson(suggestionEvent.content());
        assertThat(plan.get("suggestions").size()).isEqualTo(0);

        String visibleText = collectMessageText(events);
        assertThat(visibleText).doesNotContain("<<<SUGGESTIONS_JSON>>>");
        assertThat(visibleText).doesNotContain("this is not json");
        assertThat(findEvent(events, "done")).isNotNull();
    }

    @Test
    void missingSentinelFallsBackToEmptyList() {
        String aiOutput = "This reply does not contain the sentinel.";

        when(aiChatService.stream(any(AiInvocationRequest.class)))
            .thenReturn(Flux.just(new AiChatEvent("message", aiOutput, "conv-test-1")));

        AiChatRequest request = new AiChatRequest("Who are you?", null, sampleResumeContext());
        List<AiChatEvent> events = aiAgentService.streamChat(request).collectList().block();

        assertThat(events).isNotNull();
        AiChatEvent suggestionEvent = findEvent(events, "suggestion");
        assertThat(suggestionEvent).isNotNull();
        JsonNode plan = readJson(suggestionEvent.content());
        assertThat(plan.get("suggestions").size()).isEqualTo(0);
        assertThat(findEvent(events, "done")).isNotNull();
    }

    @Test
    void invocationRequestCarriesSentinelStrippingPersistenceSanitizer() {
        when(aiChatService.stream(any(AiInvocationRequest.class)))
            .thenReturn(Flux.just(new AiChatEvent(
                "message",
                "Visible diagnostic\n<<<SUGGESTIONS_JSON>>>{\"suggestions\":[]}",
                "conv-test-1"
            )));

        AiChatRequest request = new AiChatRequest("Review my resume", null, sampleResumeContext());
        aiAgentService.streamChat(request).collectList().block();

        ArgumentCaptor<AiInvocationRequest> captor = ArgumentCaptor.forClass(AiInvocationRequest.class);
        verify(aiChatService).stream(captor.capture());
        AiInvocationRequest captured = captor.getValue();

        assertThat(captured.persistenceSanitizer()).isNotNull();
        String sanitized = captured.persistenceSanitizer()
            .apply("Visible diagnostic\n\n<<<SUGGESTIONS_JSON>>>{\"suggestions\":[]}");
        assertThat(sanitized).isEqualTo("Visible diagnostic");

        assertThat(AiAgentService.stripSuggestionSentinel(
            "Visible diagnostic\n\n<<<SUGGESTIONS_JSON>>>{\"suggestions\":[]}"
        )).isEqualTo("Visible diagnostic");
    }

    @Test
    void streamChatPersistsSuggestionsWithCapturedUserId() {
        when(aiChatService.stream(any(AiInvocationRequest.class)))
            .thenReturn(Flux.just(new AiChatEvent(
                "message",
                "diagnosis\n<<<SUGGESTIONS_JSON>>>{\"suggestions\":[]}",
                "conv-test-1"
            )));

        AiChatRequest request = new AiChatRequest("test request", null, sampleResumeContext());
        aiAgentService.streamChat(request).collectList().block();

        verify(aiChatHistoryService).persistSuggestionPlan(
            anyString(),
            anyString(),
            anyString(),
            org.mockito.ArgumentMatchers.eq(7L)
        );
    }

    @Test
    void upstreamErrorEventIsForwardedAndTextSuppressed() {
        when(aiChatService.stream(any(AiInvocationRequest.class)))
            .thenReturn(Flux.just(
                new AiChatEvent("message", "partial text", "conv-test-1"),
                new AiChatEvent("error", "upstream failure", "conv-test-1")
            ));

        AiChatRequest request = new AiChatRequest("Review my resume", null, sampleResumeContext());
        List<AiChatEvent> events = aiAgentService.streamChat(request).collectList().block();

        assertThat(events).isNotNull();

        AiChatEvent errorEvent = findEvent(events, "error");
        assertThat(errorEvent).isNotNull();
        assertThat(errorEvent.content()).isEqualTo("upstream failure");

        String visibleText = collectMessageText(events);
        assertThat(visibleText).isEmpty();
        assertThat(findEvent(events, "suggestion")).isNull();
        assertThat(findEvent(events, "done")).isNotNull();
    }

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
        } catch (Exception exception) {
            throw new RuntimeException(exception);
        }
    }

    private AiResumeContext sampleResumeContext() {
        return new AiResumeContext(
            "resume-1",
            "Senior Engineer Resume",
            "classic",
            new ResumeContentPayload(
                new PersonalInfo(
                    "Alex Chen",
                    "Senior Backend Engineer",
                    "13800000000",
                    "alex@example.com",
                    "Shanghai",
                    "https://alex.dev",
                    "35k-45k",
                    "30",
                    ""
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
