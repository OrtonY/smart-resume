package com.smartresume.interview.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.ai.memory.AiConversationIdGenerator;
import com.smartresume.ai.memory.AiFeatureType;
import com.smartresume.ai.service.AiChatService;
import com.smartresume.interview.domain.InterviewMessageEntity;
import com.smartresume.interview.domain.InterviewSessionEntity;
import com.smartresume.interview.dto.InterviewReportDtos.InterviewReport;
import com.smartresume.interview.dto.InterviewReportDtos.LearningResource;
import com.smartresume.interview.dto.InterviewReportDtos.QuestionEvaluation;
import com.smartresume.interview.dto.InterviewReportDtos.ReportStatusEvent;
import com.smartresume.interview.dto.InterviewReportDtos.RoundEvaluation;
import com.smartresume.interview.dto.InterviewReportDtos.SkillAssessment;
import com.smartresume.interview.mapper.InterviewMessageMapper;
import com.smartresume.interview.mapper.InterviewSessionMapper;
import jakarta.annotation.PostConstruct;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class InterviewReportService {

    private static final Logger log = LoggerFactory.getLogger(InterviewReportService.class);

    private static final String REPORT_GENERATING = "GENERATING";
    private static final String REPORT_READY = "READY";
    private static final String REPORT_FAILED = "FAILED";

    private static final String ROUND_EVALUATION_SYSTEM_PROMPT = """
        你是一位专业的面试评估专家。请根据以下面试对话，对候选人在本轮面试中的表现进行评估。

        评估规则：
        - 评分范围：1-100（整数）
        - 从对话中提取每个问答对，逐题评分
        - 为每个问题提供简短反馈和参考答案要点
        - 提供本轮整体摘要

        输出必须是符合要求 schema 的有效 JSON。
        所有文本内容使用中文。
        """;

    private static final String OVERALL_REPORT_SYSTEM_PROMPT = """
        你是一位资深的面试评估总监。请根据各轮面试的评估结果，生成一份综合面试报告。

        评估规则：
        - 总体评分范围：1-100（整数），综合各轮表现加权得出
        - 提供 2-4 个亮点（strengths）
        - 提供 2-4 个改进建议（improvements）
        - 技能评估四个维度各 1-100 分：technicalAbility, communication, problemSolving, professionalism
        - 提供 1-3 个学习资源推荐，每个包含主题、推荐原因和 2-3 个学习方向
        - 综合评语 1-3 句话

        输出必须是符合要求 schema 的有效 JSON。
        所有文本内容使用中文。
        """;

    private final InterviewSessionMapper interviewSessionMapper;
    private final InterviewMessageMapper interviewMessageMapper;
    private final AiChatService aiChatService;
    private final ObjectMapper objectMapper;
    private final List<SseEmitter> emitters = new java.util.concurrent.CopyOnWriteArrayList<>();

    public InterviewReportService(
        InterviewSessionMapper interviewSessionMapper,
        InterviewMessageMapper interviewMessageMapper,
        AiChatService aiChatService,
        ObjectMapper objectMapper
    ) {
        this.interviewSessionMapper = interviewSessionMapper;
        this.interviewMessageMapper = interviewMessageMapper;
        this.aiChatService = aiChatService;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void recoverStuckGeneratingReports() {
        QueryWrapper query = QueryWrapper.create()
            .where("report_status = ?", REPORT_GENERATING);
        List<InterviewSessionEntity> stuckSessions = interviewSessionMapper.selectListByQuery(query);
        for (InterviewSessionEntity session : stuckSessions) {
            log.warn("Resetting stuck GENERATING report to FAILED for interview session {}", session.getId());
            updateReportStatus(session.getId(), REPORT_FAILED, null);
        }
        if (!stuckSessions.isEmpty()) {
            log.warn("Reset {} stuck GENERATING report(s) to FAILED on startup", stuckSessions.size());
        }
    }

    public SseEmitter subscribe(String interviewId) {
        SseEmitter emitter = new SseEmitter(300_000L);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));

        InterviewSessionEntity session = interviewSessionMapper.selectOneById(interviewId);
        if (session != null) {
            try {
                ReportStatusEvent event = new ReportStatusEvent(
                    interviewId, session.getReportStatus(), session.getReportContent());
                emitter.send(SseEmitter.event().name("report-status").data(event));
            } catch (Exception ignored) {
            }
        }
        return emitter;
    }

    @Async("reportExecutor")
    public void generateReportAsync(String interviewId) {
        log.info("Starting report generation for interview {}", interviewId);
        InterviewSessionEntity session = interviewSessionMapper.selectOneById(interviewId);
        if (session == null) {
            log.warn("Interview {} not found, skipping report generation", interviewId);
            return;
        }

        String currentStatus = session.getReportStatus();
        if (REPORT_GENERATING.equals(currentStatus) || REPORT_READY.equals(currentStatus)) {
            log.warn("Skipping report generation for interview {}: report status is already {}", interviewId, currentStatus);
            return;
        }

        updateReportStatus(interviewId, REPORT_GENERATING, null);
        broadcastStatus(interviewId, REPORT_GENERATING, null);

        try {
            InterviewReport report = generateReport(session);
            String reportJson = objectMapper.writeValueAsString(report);

            updateReportStatus(interviewId, REPORT_READY, reportJson);
            broadcastStatus(interviewId, REPORT_READY, reportJson);
            log.info("Report generation completed for interview {}", interviewId);
        } catch (Exception e) {
            log.error("Report generation failed for interview {}: {}", interviewId, e.getMessage(), e);
            updateReportStatus(interviewId, REPORT_FAILED, null);
            broadcastStatus(interviewId, REPORT_FAILED, null);
        }
    }

    private void updateReportStatus(String interviewId, String reportStatus, String reportContent) {
        InterviewSessionEntity partial = new InterviewSessionEntity();
        partial.setId(interviewId);
        partial.setReportStatus(reportStatus);
        partial.setReportContent(reportContent);
        partial.setUpdatedAt(LocalDateTime.now());
        QueryWrapper where = QueryWrapper.create().where("id = ?", interviewId);
        interviewSessionMapper.updateByQuery(partial, where);
    }

    private InterviewReport generateReport(InterviewSessionEntity session) {
        List<InterviewMessageEntity> allMessages = listMessageEntities(session.getId());
        List<String> roles = readInterviewerRoles(session);
        List<List<InterviewMessageEntity>> roundMessages = splitMessagesByRound(allMessages, roles.size());

        List<RoundEvaluation> roundEvaluations = new ArrayList<>();
        for (int i = 0; i < roles.size() && i < roundMessages.size(); i++) {
            List<InterviewMessageEntity> msgs = roundMessages.get(i);
            if (msgs.isEmpty()) continue;
            RoundEvaluation eval = evaluateRound(session, roles.get(i), msgs);
            roundEvaluations.add(eval);
        }

        return generateOverallReport(session, roundEvaluations);
    }

    private RoundEvaluation evaluateRound(InterviewSessionEntity session, String role, List<InterviewMessageEntity> messages) {
        String conversationId = AiConversationIdGenerator.generate(
            session.getResumeId(), AiFeatureType.INTERVIEW_REPORT);

        StringBuilder dialogBuilder = new StringBuilder();
        dialogBuilder.append("面试官角色: ").append(role).append("\n\n");
        for (InterviewMessageEntity msg : messages) {
            String speaker = "INTERVIEWER".equals(msg.getRole()) ? "面试官" : "候选人";
            dialogBuilder.append(speaker).append(": ").append(msg.getContent()).append("\n\n");
        }

        AiInvocationRequest request = new AiInvocationRequest(
            ROUND_EVALUATION_SYSTEM_PROMPT,
            dialogBuilder.toString(),
            conversationId
        );

        return aiChatService.callStructured(request, RoundEvaluation.class);
    }

    private InterviewReport generateOverallReport(InterviewSessionEntity session, List<RoundEvaluation> roundEvaluations) {
        String conversationId = AiConversationIdGenerator.generate(
            session.getResumeId(), AiFeatureType.INTERVIEW_REPORT);

        StringBuilder summaryBuilder = new StringBuilder();
        summaryBuilder.append("以下是各轮面试的评估结果：\n\n");
        for (RoundEvaluation eval : roundEvaluations) {
            summaryBuilder.append("## ").append(eval.role()).append(" (得分: ").append(eval.roundScore()).append("/100)\n");
            summaryBuilder.append(eval.summary()).append("\n\n");
        }

        AiInvocationRequest request = new AiInvocationRequest(
            OVERALL_REPORT_SYSTEM_PROMPT,
            summaryBuilder.toString(),
            conversationId
        );

        OverallReportResponse overall = aiChatService.callStructured(request, OverallReportResponse.class);

        return new InterviewReport(
            overall.overallScore(),
            overall.summary(),
            overall.strengths(),
            overall.improvements(),
            overall.skillAssessment(),
            roundEvaluations,
            overall.learningResources(),
            Instant.now().toString()
        );
    }

    private List<List<InterviewMessageEntity>> splitMessagesByRound(List<InterviewMessageEntity> allMessages, int totalRounds) {
        List<List<InterviewMessageEntity>> rounds = new ArrayList<>();
        List<InterviewMessageEntity> currentRound = new ArrayList<>();

        for (int i = 0; i < allMessages.size(); i++) {
            InterviewMessageEntity msg = allMessages.get(i);
            if (i > 0
                && "INTERVIEWER".equals(msg.getRole())
                && "INTERVIEWER".equals(allMessages.get(i - 1).getRole())) {
                rounds.add(currentRound);
                currentRound = new ArrayList<>();
            }
            currentRound.add(msg);
        }
        if (!currentRound.isEmpty()) {
            rounds.add(currentRound);
        }
        return rounds;
    }

    private void broadcastStatus(String interviewId, String status, String reportContent) {
        ReportStatusEvent event = new ReportStatusEvent(interviewId, status, reportContent);
        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("report-status").data(event));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }
        emitters.removeAll(deadEmitters);
    }

    private List<InterviewMessageEntity> listMessageEntities(String sessionId) {
        QueryWrapper query = QueryWrapper.create()
            .where("session_id = ?", sessionId)
            .orderBy("sort_order", true);
        return interviewMessageMapper.selectListByQuery(query);
    }

    private List<String> readInterviewerRoles(InterviewSessionEntity session) {
        String json = session.getInterviewerRolesJson();
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    record OverallReportResponse(
        int overallScore,
        String summary,
        List<String> strengths,
        List<String> improvements,
        SkillAssessment skillAssessment,
        List<LearningResource> learningResources
    ) {
    }
}
