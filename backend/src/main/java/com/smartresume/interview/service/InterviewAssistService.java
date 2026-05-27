package com.smartresume.interview.service;

import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.ai.dto.AiDtos.AiChatEvent;
import com.smartresume.ai.service.AiChatService;
import com.smartresume.common.exception.AppException;
import com.smartresume.interview.domain.InterviewAiAssistEntity;
import com.smartresume.interview.domain.InterviewMessageEntity;
import com.smartresume.interview.domain.InterviewSessionEntity;
import com.smartresume.interview.domain.table.InterviewAiAssistEntityTableDef;
import com.smartresume.interview.dto.InterviewAssistDtos.InterviewAssistResponse;
import com.smartresume.interview.mapper.InterviewAiAssistMapper;
import com.smartresume.resume.domain.ResumeEntity;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
public class InterviewAssistService {

    private static final Logger log = LoggerFactory.getLogger(InterviewAssistService.class);
    private static final Pattern SCORE_PATTERN = Pattern.compile("^SCORE:\\s*(\\d+)");

    private final InterviewAiAssistMapper interviewAiAssistMapper;
    private final AiChatService aiChatService;
    private final InterviewSessionSupportService sessionSupportService;

    public InterviewAssistService(
        InterviewAiAssistMapper interviewAiAssistMapper,
        AiChatService aiChatService,
        InterviewSessionSupportService sessionSupportService
    ) {
        this.interviewAiAssistMapper = interviewAiAssistMapper;
        this.aiChatService = aiChatService;
        this.sessionSupportService = sessionSupportService;
    }

    public InterviewAssistResponse getAssist(String sessionId, String messageId) {
        InterviewSessionEntity session = sessionSupportService.requireSession(sessionId);
        sessionSupportService.requireInterviewerMessage(messageId, session);

        InterviewAiAssistEntity entity = findByMessageId(messageId);
        if (entity == null) {
            return new InterviewAssistResponse(
                null,
                messageId,
                sessionId,
                null,
                "PENDING",
                null,
                null,
                null,
                "PENDING",
                null,
                null
            );
        }
        return toResponse(entity);
    }

    public Flux<AiChatEvent> streamAnswer(String sessionId, String messageId) {
        InterviewSessionEntity session = sessionSupportService.requireSession(sessionId);
        InterviewMessageEntity questionMessage = sessionSupportService.requireInterviewerMessage(messageId, session);

        InterviewAiAssistEntity entity = findOrCreateAssist(messageId, sessionId, session.getUserId());
        entity.setAnswerStatus("GENERATING");
        entity.setUpdatedAt(LocalDateTime.now());
        interviewAiAssistMapper.update(entity);

        ResumeEntity resume = session.getResumeId() != null
            ? sessionSupportService.loadOwnedResume(session.getResumeId(), session.getUserId())
            : null;
        String resumeJson = resume != null && resume.getLayoutJson() != null ? resume.getLayoutJson() : "{}";

        List<String> roles = sessionSupportService.readInterviewerRolesBestEffort(session);
        int roundIndex = questionMessage.getRoundIndex() != null ? questionMessage.getRoundIndex() : 0;
        String currentRole = roundIndex < roles.size() ? roles.get(roundIndex) : roles.isEmpty() ? "面试官" : roles.getFirst();

        boolean companyContextEnabled = sessionSupportService.companyContextEnabled(session);
        List<String> companySummary = companyContextEnabled
            ? sessionSupportService.readCompanyContextSummaryBestEffort(session)
            : List.of();
        String targetCompany = companyContextEnabled ? session.getTargetCompany() : null;

        String systemPrompt = InterviewPromptBuilder.buildAnswerSystemPrompt(
            currentRole,
            session.getDifficulty(),
            resumeJson,
            session.getJobDescription(),
            targetCompany,
            companySummary,
            questionMessage.getContent()
        );

        String conversationId = "interview-" + sessionId + "-answer-" + messageId;
        AiInvocationRequest request = new AiInvocationRequest(systemPrompt, questionMessage.getContent(), conversationId);

        StringBuilder assistantText = new StringBuilder();
        boolean[] completed = { false };

        return aiChatService.stream(request)
            .doOnNext(event -> {
                if ("message".equals(event.type())) {
                    assistantText.append(event.content());
                }
            })
            .doOnComplete(() -> {
                if (completed[0]) {
                    return;
                }
                completed[0] = true;
                entity.setAnswerContent(assistantText.toString());
                entity.setAnswerStatus(assistantText.isEmpty() ? "FAILED" : "READY");
                entity.setUpdatedAt(LocalDateTime.now());
                interviewAiAssistMapper.update(entity);
            })
            .doOnCancel(() -> {
                if (completed[0]) {
                    return;
                }
                completed[0] = true;
                entity.setAnswerContent(assistantText.toString());
                entity.setAnswerStatus(assistantText.isEmpty() ? "FAILED" : "READY");
                entity.setUpdatedAt(LocalDateTime.now());
                interviewAiAssistMapper.update(entity);
            })
            .doOnError(error -> {
                if (completed[0]) {
                    return;
                }
                completed[0] = true;
                log.error("AI answer stream error for session {} message {}: {}", sessionId, messageId, error.getMessage());
                entity.setAnswerContent(assistantText.isEmpty() ? null : assistantText.toString());
                entity.setAnswerStatus("FAILED");
                entity.setUpdatedAt(LocalDateTime.now());
                interviewAiAssistMapper.update(entity);
            });
    }

    public Flux<AiChatEvent> streamScore(String sessionId, String messageId, String candidateAnswer) {
        if (candidateAnswer == null || candidateAnswer.isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "请先输入回答内容再进行评分");
        }

        InterviewSessionEntity session = sessionSupportService.requireSession(sessionId);
        InterviewMessageEntity questionMessage = sessionSupportService.requireInterviewerMessage(messageId, session);

        InterviewAiAssistEntity entity = findOrCreateAssist(messageId, sessionId, session.getUserId());
        entity.setScoreStatus("GENERATING");
        entity.setCandidateAnswer(candidateAnswer.trim());
        entity.setUpdatedAt(LocalDateTime.now());
        interviewAiAssistMapper.update(entity);

        ResumeEntity resume = session.getResumeId() != null
            ? sessionSupportService.loadOwnedResume(session.getResumeId(), session.getUserId())
            : null;
        String resumeJson = resume != null && resume.getLayoutJson() != null ? resume.getLayoutJson() : "{}";

        List<String> roles = sessionSupportService.readInterviewerRolesBestEffort(session);
        int roundIndex = questionMessage.getRoundIndex() != null ? questionMessage.getRoundIndex() : 0;
        String currentRole = roundIndex < roles.size() ? roles.get(roundIndex) : roles.isEmpty() ? "面试官" : roles.getFirst();

        boolean companyContextEnabled = sessionSupportService.companyContextEnabled(session);
        List<String> companySummary = companyContextEnabled
            ? sessionSupportService.readCompanyContextSummaryBestEffort(session)
            : List.of();
        String targetCompany = companyContextEnabled ? session.getTargetCompany() : null;

        String systemPrompt = InterviewPromptBuilder.buildScoreSystemPrompt(
            currentRole,
            session.getDifficulty(),
            resumeJson,
            session.getJobDescription(),
            targetCompany,
            companySummary,
            questionMessage.getContent(),
            candidateAnswer.trim()
        );

        String conversationId = "interview-" + sessionId + "-score-" + messageId;
        AiInvocationRequest request = new AiInvocationRequest(systemPrompt, candidateAnswer.trim(), conversationId);

        StringBuilder assistantText = new StringBuilder();
        boolean[] completed = { false };

        return aiChatService.stream(request)
            .doOnNext(event -> {
                if ("message".equals(event.type())) {
                    assistantText.append(event.content());
                }
            })
            .doOnComplete(() -> {
                if (completed[0]) {
                    return;
                }
                completed[0] = true;
                parseAndPersistScore(entity, assistantText.toString());
            })
            .doOnCancel(() -> {
                if (completed[0]) {
                    return;
                }
                completed[0] = true;
                parseAndPersistScore(entity, assistantText.toString());
            })
            .doOnError(error -> {
                if (completed[0]) {
                    return;
                }
                completed[0] = true;
                log.error("AI score stream error for session {} message {}: {}", sessionId, messageId, error.getMessage());
                entity.setFeedback(assistantText.isEmpty() ? null : assistantText.toString());
                entity.setScoreStatus("FAILED");
                entity.setUpdatedAt(LocalDateTime.now());
                interviewAiAssistMapper.update(entity);
            });
    }

    private void parseAndPersistScore(InterviewAiAssistEntity entity, String fullText) {
        if (fullText == null || fullText.isBlank()) {
            entity.setScoreStatus("FAILED");
            entity.setUpdatedAt(LocalDateTime.now());
            interviewAiAssistMapper.update(entity);
            return;
        }

        Integer score = null;
        String feedback = fullText;

        Matcher matcher = SCORE_PATTERN.matcher(fullText);
        if (matcher.find()) {
            try {
                int parsed = Integer.parseInt(matcher.group(1));
                score = Math.max(InterviewConstants.SCORE_MIN, Math.min(InterviewConstants.SCORE_MAX, parsed));
            } catch (NumberFormatException ignored) {
            }
            int feedbackStart = fullText.indexOf("\n", matcher.end());
            if (feedbackStart >= 0) {
                feedback = fullText.substring(feedbackStart).trim();
            }
        }

        entity.setScore(score);
        entity.setFeedback(feedback);
        entity.setScoreStatus("READY");
        entity.setUpdatedAt(LocalDateTime.now());
        interviewAiAssistMapper.update(entity);
    }

    private InterviewAiAssistEntity findByMessageId(String messageId) {
        InterviewAiAssistEntityTableDef table = InterviewAiAssistEntityTableDef.INTERVIEW_AI_ASSIST_ENTITY;
        QueryWrapper query = QueryWrapper.create().where(table.MESSAGE_ID.eq(messageId));
        return interviewAiAssistMapper.selectOneByQuery(query);
    }

    private InterviewAiAssistEntity findOrCreateAssist(String messageId, String sessionId, Long userId) {
        InterviewAiAssistEntity existing = findByMessageId(messageId);
        if (existing != null) {
            return existing;
        }

        LocalDateTime now = LocalDateTime.now();
        InterviewAiAssistEntity entity = new InterviewAiAssistEntity();
        entity.setId(UUID.randomUUID().toString());
        entity.setMessageId(messageId);
        entity.setSessionId(sessionId);
        entity.setUserId(userId);
        entity.setAnswerStatus("PENDING");
        entity.setScoreStatus("PENDING");
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        interviewAiAssistMapper.insert(entity);
        return entity;
    }

    private InterviewAssistResponse toResponse(InterviewAiAssistEntity entity) {
        return new InterviewAssistResponse(
            entity.getId(),
            entity.getMessageId(),
            entity.getSessionId(),
            entity.getAnswerContent(),
            entity.getAnswerStatus(),
            entity.getCandidateAnswer(),
            entity.getScore(),
            entity.getFeedback(),
            entity.getScoreStatus(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
}
