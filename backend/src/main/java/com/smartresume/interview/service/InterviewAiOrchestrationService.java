package com.smartresume.interview.service;

import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.ai.dto.AiDtos.AiChatEvent;
import com.smartresume.ai.memory.AiConversationIdGenerator;
import com.smartresume.ai.memory.AiFeatureType;
import com.smartresume.ai.service.AiChatService;
import com.smartresume.common.exception.AppException;
import com.smartresume.interview.domain.InterviewMessageEntity;
import com.smartresume.interview.domain.InterviewSessionEntity;
import com.smartresume.resume.domain.ResumeEntity;
import com.smartresume.resume.service.ResumeContentService;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
public class InterviewAiOrchestrationService {

    private static final Logger log = LoggerFactory.getLogger(InterviewAiOrchestrationService.class);

    private final AiChatService aiChatService;
    private final InterviewSessionSupportService sessionSupportService;
    private final ResumeContentService resumeContentService;
    private final InterviewQuestionBankSamplingService questionBankSamplingService;

    private record RoundTopicExtractionResult(List<String> topics) {
    }

    private record CompanyContextSummaryResult(List<String> summary) {
    }

    public InterviewAiOrchestrationService(
        AiChatService aiChatService,
        InterviewSessionSupportService sessionSupportService,
        ResumeContentService resumeContentService,
        InterviewQuestionBankSamplingService questionBankSamplingService
    ) {
        this.aiChatService = aiChatService;
        this.sessionSupportService = sessionSupportService;
        this.resumeContentService = resumeContentService;
        this.questionBankSamplingService = questionBankSamplingService;
    }

    public String generateAiResponse(InterviewSessionEntity session, ResumeEntity resume, String userMessage, int currentQuestionCount) {
        return generateAiResponse(session, resume, userMessage, currentQuestionCount, List.of());
    }

    public String generateAiResponse(
        InterviewSessionEntity session,
        ResumeEntity resume,
        String userMessage,
        int currentQuestionCount,
        List<String> previousRoundTopics
    ) {
        AiInvocationRequest invocationRequest = buildInterviewTurnRequest(
            session,
            resume,
            userMessage,
            currentQuestionCount,
            previousRoundTopics
        );
        try {
            return aiChatService.call(invocationRequest);
        } catch (Exception exception) {
            log.error(
                "AI call failed for interview session {} (conversationId={}): {}",
                session.getId(),
                invocationRequest.conversationId(),
                exception.getMessage()
            );
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "AI 服务暂时不可用，请稍后重试");
        }
    }

    public Flux<AiChatEvent> streamInterviewResponse(
        InterviewSessionEntity session,
        ResumeEntity resume,
        String userMessage,
        int currentQuestionCount,
        List<String> previousRoundTopics
    ) {
        return aiChatService.stream(buildInterviewTurnRequest(
            session,
            resume,
            userMessage,
            currentQuestionCount,
            previousRoundTopics
        ));
    }

    public List<String> extractRoundTopics(InterviewSessionEntity session, int roundIndex) {
        List<InterviewMessageEntity> allMessages = sessionSupportService.listMessageEntities(session.getId(), session.getUserId());
        List<InterviewMessageEntity> roundMessages = allMessages.stream()
            .filter(message -> message.getRoundIndex() != null && message.getRoundIndex() == roundIndex)
            .toList();
        if (roundMessages.isEmpty()) {
            return List.of();
        }

        StringBuilder conversation = new StringBuilder();
        for (InterviewMessageEntity message : roundMessages) {
            conversation.append(message.getRole()).append(": ").append(message.getContent()).append("\n");
        }

        String extractionPrompt = """
            请从以下面试对话中提取“已经完成提问并得到候选人回答”的具体技术栈关键词（如 Spring Boot、Redis、MySQL、Docker 等）。

            严格判定规则：
            1. 只有当 INTERVIEWER 明确针对某个技术栈提出问题，并且后续 CANDIDATE 对该技术栈给出了回答，才记录该技术栈。
            2. 如果技术栈只出现在候选人的自我介绍、项目介绍、简历/JD 信息、或候选人单方面提及中，不要记录。
            3. 如果 INTERVIEWER 只是要求“自我介绍”“介绍项目”“描述贡献”“展开讲讲经历”，即使候选人回答中提到了技术栈，也不要记录。
            4. 如果 INTERVIEWER 提到了某技术栈但候选人尚未回答，不要记录。
            5. 只返回 JSON 对象，不要其他文字。格式必须是：{"topics":["Spring Boot","Redis"]}。
            6. 如果没有符合条件的技术栈问题，返回：{"topics":[]}。

            对话内容：
            %s
            """.formatted(conversation);

        AiInvocationRequest extractionRequest = new AiInvocationRequest(
            "你是一个严格的面试问题技术栈提取助手。只有“面试官明确提问且候选人已经回答”的技术栈才可进入结果；只返回 JSON 对象。",
            extractionPrompt,
            "interview-" + session.getId() + "-extract-" + roundIndex
        );

        try {
            RoundTopicExtractionResult response = aiChatService.callStructured(
                extractionRequest,
                RoundTopicExtractionResult.class
            );
            return normalizeDistinctValues(response == null ? null : response.topics(), Integer.MAX_VALUE);
        } catch (Exception exception) {
            log.warn(
                "AI topic extraction failed for session {} round {}: {}",
                session.getId(),
                roundIndex,
                exception.getMessage()
            );
            return List.of();
        }
    }

    public List<String> extractCompanyContextSummary(String targetCompany, InterviewSessionEntity session, ResumeEntity resume) {
        StringBuilder prompt = new StringBuilder("""
            请围绕目标公司生成 %d 到 %d 条适合用于面试上下文注入的摘要。要求：
            1. 只输出 JSON 对象，格式必须是 {"summary":["...","..."]}。
            2. 重点提炼公司主营业务、行业特点、技术或组织特征，便于面试官偶尔结合业务场景提问。
            3. 摘要要稳健，不要编造具体营收、最新组织变化或无法确认的细节。
            4. 每条摘要控制在 %d 到 %d 个中文字符左右，避免空泛口号。
            5. 如果把握不足，也尽量给出行业层面的稳妥描述；若仍无法判断，返回 {"summary":[]}。
            """.formatted(
            InterviewConstants.MIN_COMPANY_CONTEXT_SUMMARY_ITEMS,
            InterviewConstants.MAX_COMPANY_CONTEXT_SUMMARY_ITEMS,
            InterviewConstants.MIN_COMPANY_CONTEXT_SUMMARY_LENGTH,
            InterviewConstants.MAX_COMPANY_CONTEXT_SUMMARY_LENGTH
        ));
        prompt.append("目标公司：").append(targetCompany).append("\n");
        if (session.getJobDescription() != null && !session.getJobDescription().isBlank()) {
            prompt.append("岗位 JD：").append(session.getJobDescription()).append("\n");
        }
        if (resume != null) {
            prompt.append("Resume context (visible sections only):\n")
                .append(resumeContentService.buildAiVisibleContextJson(resume))
                .append("\n");
        }

        AiInvocationRequest request = new AiInvocationRequest(
            "你是一名谨慎的公司背景提炼助手。请输出适合技术面试上下文注入的精炼摘要，只返回 JSON。",
            prompt.toString(),
            AiConversationIdGenerator.generate(session.getId(), AiFeatureType.INTERVIEW)
        );

        try {
            CompanyContextSummaryResult response = aiChatService.callStructured(request, CompanyContextSummaryResult.class);
            return normalizeDistinctValues(
                response == null ? null : response.summary(),
                InterviewConstants.MAX_COMPANY_CONTEXT_SUMMARY_ITEMS
            );
        } catch (Exception exception) {
            log.warn(
                "Failed to extract company context for session {} company {}: {}",
                session.getId(),
                targetCompany,
                exception.getMessage()
            );
            return List.of();
        }
    }

    private AiInvocationRequest buildInterviewTurnRequest(
        InterviewSessionEntity session,
        ResumeEntity resume,
        String userMessage,
        int currentQuestionCount,
        List<String> previousRoundTopics
    ) {
        List<String> roles = sessionSupportService.readInterviewerRoles(session);
        int roundIndex = sessionSupportService.currentRoundIndex(session);
        String currentRole = roles.get(roundIndex);
        String resumeJson = resume != null ? resumeContentService.buildAiVisibleContextJson(resume) : "{}";
        boolean companyContextEnabled = sessionSupportService.companyContextEnabled(session);
        List<String> companySummary = companyContextEnabled
            ? sessionSupportService.readCompanyContextSummary(session)
            : List.of();
        InterviewQuestionBankSamplingService.QuestionBankPromptContext questionBankContext =
            questionBankSamplingService.sampleForPrompt(session);

        String systemPrompt = InterviewPromptBuilder.buildSystemPrompt(
            currentRole,
            session.getDifficulty(),
            resumeJson,
            session.getJobDescription(),
            companyContextEnabled ? session.getTargetCompany() : null,
            companySummary,
            currentQuestionCount,
            InterviewConstants.MAX_QUESTIONS_PER_ROUND,
            previousRoundTopics,
            questionBankContext.relevance(),
            questionBankContext.questions()
        );

        return new AiInvocationRequest(
            systemPrompt,
            userMessage,
            sessionSupportService.buildRoundConversationId(session.getId(), roundIndex)
        );
    }

    private List<String> normalizeDistinctValues(List<String> values, int maxItems) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        Set<String> normalized = new LinkedHashSet<>();
        for (String value : values) {
            if (value == null) {
                continue;
            }
            String trimmed = value.trim();
            if (!trimmed.isEmpty()) {
                normalized.add(trimmed);
            }
            if (normalized.size() >= maxItems) {
                break;
            }
        }
        return new ArrayList<>(normalized);
    }
}
