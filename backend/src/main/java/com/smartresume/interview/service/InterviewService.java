package com.smartresume.interview.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mybatisflex.core.paginate.Page;
import com.mybatisflex.core.query.QueryCondition;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.ai.dto.AiDtos.AiChatEvent;
import com.smartresume.ai.memory.AiConversationIdGenerator;
import com.smartresume.ai.memory.AiFeatureType;
import com.smartresume.ai.service.AiChatService;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.interview.domain.InterviewMessageEntity;
import com.smartresume.interview.domain.InterviewRoundTopicEntity;
import com.smartresume.interview.domain.InterviewSessionEntity;
import com.smartresume.interview.domain.table.InterviewMessageEntityTableDef;
import com.smartresume.interview.domain.table.InterviewRoundTopicEntityTableDef;
import com.smartresume.interview.domain.table.InterviewSessionEntityTableDef;
import com.smartresume.interview.dto.InterviewDtos.InterviewCreateRequest;
import com.smartresume.interview.dto.InterviewDtos.InterviewDetailResponse;
import com.smartresume.interview.dto.InterviewDtos.InterviewMessageRequest;
import com.smartresume.interview.dto.InterviewDtos.InterviewMessageResponse;
import com.smartresume.interview.dto.InterviewDtos.InterviewPageResponse;
import com.smartresume.interview.dto.InterviewDtos.InterviewSummaryResponse;
import com.smartresume.interview.mapper.InterviewMessageMapper;
import com.smartresume.interview.mapper.InterviewRoundTopicMapper;
import com.smartresume.interview.mapper.InterviewSessionMapper;
import com.smartresume.resume.domain.ResumeEntity;
import com.smartresume.resume.mapper.ResumeMapper;
import java.time.LocalDateTime;
import java.util.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.memory.repository.jdbc.JdbcChatMemoryRepository;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;

import static com.mybatisflex.core.query.QueryMethods.lower;

@Service
public class InterviewService {

    private static final Logger log = LoggerFactory.getLogger(InterviewService.class);

    private static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
    private static final String STATUS_PAUSED = "PAUSED";
    private static final String STATUS_ENDED = "ENDED";
    private static final String REPORT_PENDING = "PENDING";
    private static final String COMPANY_CONTEXT_NOT_REQUESTED = "NOT_REQUESTED";
    private static final String COMPANY_CONTEXT_READY = "READY";
    private static final String COMPANY_CONTEXT_FAILED = "FAILED";
    private static final Set<String> DIFFICULTIES = Set.of("EASY", "MEDIUM", "HARD");
    private static final Set<String> STATUSES = Set.of(STATUS_IN_PROGRESS, STATUS_PAUSED, STATUS_ENDED);
    private static final int MAX_QUESTIONS_PER_ROUND = 18;

    private final InterviewSessionMapper interviewSessionMapper;
    private final InterviewMessageMapper interviewMessageMapper;
    private final InterviewRoundTopicMapper interviewRoundTopicMapper;
    private final ResumeMapper resumeMapper;
    private final ObjectMapper objectMapper;
    private final JdbcChatMemoryRepository chatMemoryRepository;
    private final AiChatService aiChatService;
    private final InterviewReportService interviewReportService;

    private record RoundTopicExtractionResult(List<String> topics) {
    }

    private record CompanyContextSummaryResult(List<String> summary) {
    }

    public InterviewService(
        InterviewSessionMapper interviewSessionMapper,
        InterviewMessageMapper interviewMessageMapper,
        InterviewRoundTopicMapper interviewRoundTopicMapper,
        ResumeMapper resumeMapper,
        ObjectMapper objectMapper,
        JdbcChatMemoryRepository chatMemoryRepository,
        AiChatService aiChatService,
        InterviewReportService interviewReportService
    ) {
        this.interviewSessionMapper = interviewSessionMapper;
        this.interviewMessageMapper = interviewMessageMapper;
        this.interviewRoundTopicMapper = interviewRoundTopicMapper;
        this.resumeMapper = resumeMapper;
        this.objectMapper = objectMapper;
        this.chatMemoryRepository = chatMemoryRepository;
        this.aiChatService = aiChatService;
        this.interviewReportService = interviewReportService;
    }

    public InterviewPageResponse listInterviews(String resumeId, String status, String targetCompany, String keyword, int page, int pageSize) {
        int safePage = Math.max(1, page);
        int safePageSize = Math.max(1, pageSize);
        long userId = CurrentUserContext.requireUserId();
        String normalizedStatus = normalizeOptionalStatus(status);
        String normalizedTargetCompany = normalizeOptionalText(targetCompany);
        String normalizedKeyword = keyword == null ? "" : keyword.trim();

        InterviewSessionEntityTableDef sessionTable = InterviewSessionEntityTableDef.INTERVIEW_SESSION_ENTITY;
        QueryWrapper query = QueryWrapper.create().where(sessionTable.USER_ID.eq(userId));
        if (resumeId != null && !resumeId.isBlank()) {
            query.and(sessionTable.RESUME_ID.eq(resumeId));
        }
        if (normalizedStatus != null) {
            query.and(sessionTable.STATUS.eq(normalizedStatus));
        }
        if (normalizedTargetCompany != null) {
            query.and(lower(sessionTable.TARGET_COMPANY).like(normalizedTargetCompany.toLowerCase(Locale.ROOT)));
        }
        if (!normalizedKeyword.isBlank()) {
            String pattern = normalizedKeyword.toLowerCase(Locale.ROOT);
            QueryCondition keywordCondition = lower(sessionTable.TITLE).like(pattern)
                .or(lower(sessionTable.JOB_DESCRIPTION).like(pattern))
                .or(lower(sessionTable.TARGET_COMPANY).like(pattern));
            query.and(keywordCondition);
        }
        query.orderBy(sessionTable.UPDATED_AT, false);
        Page<InterviewSessionEntity> pagedSessions = interviewSessionMapper.paginate(safePage, safePageSize, query);

        List<InterviewSummaryResponse> items = pagedSessions.getRecords().stream()
            .map(this::toSummary)
            .toList();

        return new InterviewPageResponse(
            items,
            pagedSessions.getTotalRow(),
            (int) pagedSessions.getPageNumber(),
            (int) pagedSessions.getPageSize(),
            Math.max(1, (int) pagedSessions.getTotalPage())
        );
    }

    @Transactional
    public InterviewDetailResponse createInterview(InterviewCreateRequest request) {
        long userId = CurrentUserContext.requireUserId();
        String resumeId = normalizeOptionalText(request.resumeId());
        String jobDescription = normalizeOptionalText(request.jobDescription());
        String targetCompany = normalizeOptionalText(request.targetCompany());

        if (resumeId == null && jobDescription == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "简历和 JD 至少填写一个");
        }

        ResumeEntity resume = resumeId != null ? requireActiveResume(resumeId, userId) : null;
        LocalDateTime now = LocalDateTime.now();

        InterviewSessionEntity session = new InterviewSessionEntity();
        session.setId(UUID.randomUUID().toString());
        session.setUserId(userId);
        session.setResumeId(resume != null ? resume.getId() : null);
        session.setTitle(request.title().trim());
        session.setAiConversationId("interview-" + session.getId());
        session.setJobDescription(jobDescription);
        session.setTargetCompany(targetCompany);
        session.setDifficulty(normalizeDifficulty(request.difficulty()));
        session.setInterviewerRolesJson(toJson(normalizeInterviewerRoles(request.interviewerRoles())));
        session.setCompanyContextSummaryJson(toJson(List.of()));
        session.setCompanyContextStatus(targetCompany == null ? COMPANY_CONTEXT_NOT_REQUESTED : COMPANY_CONTEXT_FAILED);
        session.setActiveRoundIndex(0);
        session.setStatus(STATUS_IN_PROGRESS);
        session.setReportStatus(REPORT_PENDING);
        session.setTotalElapsedSeconds(0);
        session.setLastResumedAt(now);
        session.setCreatedAt(now);
        session.setUpdatedAt(now);

        if (targetCompany != null) {
            List<String> companyContextSummary = extractCompanyContextSummary(targetCompany, session, resume);
            session.setCompanyContextSummaryJson(toJson(companyContextSummary));
            session.setCompanyContextStatus(
                companyContextSummary.isEmpty() ? COMPANY_CONTEXT_FAILED : COMPANY_CONTEXT_READY
            );
        }

        interviewSessionMapper.insert(session);

        String openingMessage = generateAiResponse(session, resume, "请开始第一轮面试，先做简短自我介绍然后提出第一个面试问题。", 0);
        appendMessage(session, "INTERVIEWER", openingMessage, 1, now);
        return getInterview(session.getId());
    }

    public InterviewDetailResponse getInterview(String interviewId) {
        InterviewSessionEntity session = requireSession(interviewId);
        return toDetail(session, listMessages(session));
    }

    @Transactional
    public InterviewDetailResponse pauseInterview(String interviewId) {
        InterviewSessionEntity session = requireSession(interviewId);
        requireStatus(session, STATUS_IN_PROGRESS, "Only in-progress interviews can be paused");
        LocalDateTime now = LocalDateTime.now();
        accumulateElapsedTime(session, now);
        session.setStatus(STATUS_PAUSED);
        session.setUpdatedAt(now);
        updateSessionWithNulls(session);
        return getInterview(session.getId());
    }

    @Transactional
    public InterviewDetailResponse continueInterview(String interviewId) {
        InterviewSessionEntity session = requireSession(interviewId);
        requireStatus(session, STATUS_PAUSED, "Only paused interviews can be continued");
        LocalDateTime now = LocalDateTime.now();
        session.setStatus(STATUS_IN_PROGRESS);
        session.setLastResumedAt(now);
        session.setUpdatedAt(now);
        interviewSessionMapper.update(session);
        return getInterview(session.getId());
    }

    @Transactional
    public InterviewDetailResponse nextRound(String interviewId) {
        InterviewSessionEntity session = requireSession(interviewId);
        requireStatus(session, STATUS_IN_PROGRESS, "Only in-progress interviews can advance rounds");

        List<String> roles = readInterviewerRoles(session);
        int currentIndex = currentRoundIndex(session);
        if (currentIndex >= roles.size() - 1) {
            throw new AppException(HttpStatus.CONFLICT, "Interview is already at the final interviewer round");
        }

        LocalDateTime now = LocalDateTime.now();
        int nextOrder = listMessageEntities(session.getId(), session.getUserId()).stream()
            .map(InterviewMessageEntity::getSortOrder)
            .filter(Objects::nonNull)
            .max(Integer::compareTo)
            .orElse(0) + 1;

        session.setActiveRoundIndex(currentIndex + 1);
        session.setUpdatedAt(now);
        interviewSessionMapper.update(session);

        // Extract tech topics from current round (best-effort)
        try {
            List<String> topics = extractRoundTopics(session, currentIndex);
            if (!topics.isEmpty()) {
                InterviewRoundTopicEntity topicEntity = new InterviewRoundTopicEntity();
                topicEntity.setId(UUID.randomUUID().toString());
                topicEntity.setUserId(session.getUserId());
                topicEntity.setSessionId(session.getId());
                topicEntity.setRoundIndex(currentIndex);
                topicEntity.setTopicsJson(toJson(topics));
                interviewRoundTopicMapper.insert(topicEntity);
            }
        } catch (Exception e) {
            log.warn("Failed to extract tech topics for session {} round {}: {}",
                session.getId(), currentIndex, e.getMessage());
        }

        ResumeEntity resume = session.getResumeId() != null ? requireActiveResume(session.getResumeId(), session.getUserId()) : null;
        List<String> previousRoundTopics = getPreviousRoundTopics(session.getId(), session.getUserId(), currentIndex + 1);
        String roundOpeningMessage = generateAiResponse(session, resume,
            "你是新一轮的面试官，请做简短自我介绍并提出第一个面试问题。", 0, previousRoundTopics);
        appendMessage(session, "INTERVIEWER", roundOpeningMessage, nextOrder, now.plusNanos(1));
        return getInterview(session.getId());
    }

    @Transactional
    public InterviewDetailResponse submitMessage(String interviewId, InterviewMessageRequest request) {
        InterviewSessionEntity session = requireSession(interviewId);
        requireStatus(session, STATUS_IN_PROGRESS, "Only in-progress interviews accept new messages");

        List<InterviewMessageEntity> currentMessages = listMessageEntities(session.getId(), session.getUserId());
        int nextOrder = currentMessages.stream()
            .map(InterviewMessageEntity::getSortOrder)
            .filter(Objects::nonNull)
            .max(Integer::compareTo)
            .orElse(0) + 1;
        LocalDateTime now = LocalDateTime.now();

        appendMessage(session, "CANDIDATE", request.content().trim(), nextOrder, now);

        int questionCount = countQuestionsInCurrentRound(currentMessages, session.getActiveRoundIndex());
        ResumeEntity resume = session.getResumeId() != null ? requireActiveResume(session.getResumeId(), session.getUserId()) : null;
        String aiResponse = generateAiResponse(session, resume, request.content().trim(), questionCount);
        appendMessage(session, "INTERVIEWER", aiResponse, nextOrder + 1, now.plusNanos(1));

        session.setUpdatedAt(now);
        interviewSessionMapper.update(session);
        return getInterview(session.getId());
    }

    public Flux<AiChatEvent> streamMessage(String interviewId, InterviewMessageRequest request) {
        InterviewSessionEntity session = requireSession(interviewId);
        requireStatus(session, STATUS_IN_PROGRESS, "Only in-progress interviews accept new messages");

        List<InterviewMessageEntity> currentMessages = listMessageEntities(session.getId(), session.getUserId());
        int nextOrder = currentMessages.stream()
            .map(InterviewMessageEntity::getSortOrder)
            .filter(Objects::nonNull)
            .max(Integer::compareTo)
            .orElse(0) + 1;
        LocalDateTime now = LocalDateTime.now();

        persistMessage(session, "CANDIDATE", request.content().trim(), nextOrder, now);

        int questionCount = countQuestionsInCurrentRound(currentMessages, session.getActiveRoundIndex());
        ResumeEntity resume = session.getResumeId() != null ? requireActiveResume(session.getResumeId(), session.getUserId()) : null;

        List<String> roles = readInterviewerRoles(session);
        int roundIndex = currentRoundIndex(session);
        String currentRole = roles.get(roundIndex);
        String resumeJson = resume != null && resume.getLayoutJson() != null ? resume.getLayoutJson() : "{}";

        List<String> previousRoundTopics = getPreviousRoundTopics(session.getId(), session.getUserId(), roundIndex);
        String systemPrompt = InterviewPromptBuilder.buildSystemPrompt(
            currentRole,
            session.getDifficulty(),
            resumeJson,
            session.getJobDescription(),
            companyContextEnabled(session) ? session.getTargetCompany() : null,
            companyContextEnabled(session) ? readCompanyContextSummary(session) : List.of(),
            questionCount,
            MAX_QUESTIONS_PER_ROUND,
            previousRoundTopics
        );

        String conversationId = buildRoundConversationId(session.getId(), roundIndex);
        AiInvocationRequest invocationRequest = new AiInvocationRequest(
            systemPrompt, request.content().trim(), conversationId
        );

        StringBuilder assistantText = new StringBuilder();
        boolean[] completed = { false };

        return aiChatService.stream(invocationRequest)
            .doOnNext(event -> {
                if ("message".equals(event.type())) {
                    assistantText.append(event.content());
                }
            })
            .doOnComplete(() -> {
                if (completed[0]) return;
                completed[0] = true;
                if (!assistantText.isEmpty()) {
                    persistMessage(session, "INTERVIEWER", assistantText.toString(), nextOrder + 1, LocalDateTime.now());
                    session.setUpdatedAt(LocalDateTime.now());
                    interviewSessionMapper.update(session);
                }
            })
            .doOnCancel(() -> {
                if (completed[0]) return;
                completed[0] = true;
                if (!assistantText.isEmpty()) {
                    persistMessageWithStatus(session, "INTERVIEWER", assistantText.toString(), nextOrder + 1, LocalDateTime.now(), "ABORTED");
                    session.setUpdatedAt(LocalDateTime.now());
                    interviewSessionMapper.update(session);
                }
            })
            .doOnError(err -> {
                if (completed[0]) return;
                completed[0] = true;
                log.error("Stream error for interview {}: {}", session.getId(), err.getMessage());
                if (!assistantText.isEmpty()) {
                    persistMessageWithStatus(session, "INTERVIEWER", assistantText.toString(), nextOrder + 1, LocalDateTime.now(), "ABORTED");
                    session.setUpdatedAt(LocalDateTime.now());
                    interviewSessionMapper.update(session);
                }
            });
    }

    public Flux<AiChatEvent> regenerateStreamMessage(String interviewId) {
        InterviewSessionEntity session = requireSession(interviewId);
        requireStatus(session, STATUS_IN_PROGRESS, "Only in-progress interviews can regenerate messages");

        List<InterviewMessageEntity> currentMessages = listMessageEntities(session.getId(), session.getUserId());
        InterviewMessageEntity lastCandidate = null;
        for (int i = currentMessages.size() - 1; i >= 0; i--) {
            if ("CANDIDATE".equals(currentMessages.get(i).getRole())) {
                lastCandidate = currentMessages.get(i);
                break;
            }
        }
        if (lastCandidate == null) {
            throw new AppException(HttpStatus.CONFLICT, "No candidate message to regenerate from");
        }

        int nextOrder = currentMessages.stream()
            .map(InterviewMessageEntity::getSortOrder)
            .filter(Objects::nonNull)
            .max(Integer::compareTo)
            .orElse(0) + 1;

        int questionCount = countQuestionsInCurrentRound(currentMessages, session.getActiveRoundIndex());
        ResumeEntity resume = session.getResumeId() != null ? requireActiveResume(session.getResumeId(), session.getUserId()) : null;

        List<String> roles = readInterviewerRoles(session);
        int roundIndex = currentRoundIndex(session);
        String currentRole = roles.get(roundIndex);
        String resumeJson = resume != null && resume.getLayoutJson() != null ? resume.getLayoutJson() : "{}";

        List<String> previousRoundTopics = getPreviousRoundTopics(session.getId(), session.getUserId(), roundIndex);
        String systemPrompt = InterviewPromptBuilder.buildSystemPrompt(
            currentRole,
            session.getDifficulty(),
            resumeJson,
            session.getJobDescription(),
            companyContextEnabled(session) ? session.getTargetCompany() : null,
            companyContextEnabled(session) ? readCompanyContextSummary(session) : List.of(),
            questionCount,
            MAX_QUESTIONS_PER_ROUND,
            previousRoundTopics
        );

        String conversationId = buildRoundConversationId(session.getId(), roundIndex);
        AiInvocationRequest invocationRequest = new AiInvocationRequest(
            systemPrompt, lastCandidate.getContent(), conversationId
        );

        StringBuilder assistantText = new StringBuilder();
        boolean[] completed = { false };
        final int assistantOrder = nextOrder;

        return aiChatService.stream(invocationRequest)
            .doOnNext(event -> {
                if ("message".equals(event.type())) {
                    assistantText.append(event.content());
                }
            })
            .doOnComplete(() -> {
                if (completed[0]) return;
                completed[0] = true;
                if (!assistantText.isEmpty()) {
                    persistMessage(session, "INTERVIEWER", assistantText.toString(), assistantOrder, LocalDateTime.now());
                    session.setUpdatedAt(LocalDateTime.now());
                    interviewSessionMapper.update(session);
                }
            })
            .doOnCancel(() -> {
                if (completed[0]) return;
                completed[0] = true;
                if (!assistantText.isEmpty()) {
                    persistMessageWithStatus(session, "INTERVIEWER", assistantText.toString(), assistantOrder, LocalDateTime.now(), "ABORTED");
                    session.setUpdatedAt(LocalDateTime.now());
                    interviewSessionMapper.update(session);
                }
            })
            .doOnError(err -> {
                if (completed[0]) return;
                completed[0] = true;
                log.error("Regenerate stream error for interview {}: {}", session.getId(), err.getMessage());
                if (!assistantText.isEmpty()) {
                    persistMessageWithStatus(session, "INTERVIEWER", assistantText.toString(), assistantOrder, LocalDateTime.now(), "ABORTED");
                    session.setUpdatedAt(LocalDateTime.now());
                    interviewSessionMapper.update(session);
                }
            });
    }

    @Transactional
    public InterviewDetailResponse endInterview(String interviewId) {
        InterviewSessionEntity session = requireSession(interviewId);
        if (STATUS_ENDED.equals(session.getStatus())) {
            return getInterview(session.getId());
        }
        if (!STATUS_IN_PROGRESS.equals(session.getStatus()) && !STATUS_PAUSED.equals(session.getStatus())) {
            throw new AppException(HttpStatus.CONFLICT, "Interview cannot be ended");
        }

        LocalDateTime now = LocalDateTime.now();
        accumulateElapsedTime(session, now);
        session.setStatus(STATUS_ENDED);
        session.setReportStatus(REPORT_PENDING);
        session.setEndedAt(now);
        session.setUpdatedAt(now);
        updateSessionWithNulls(session);

        interviewReportService.generateReportAsync(session.getId(), session.getUserId());

        return getInterview(session.getId());
    }

    private InterviewSessionEntity requireSession(String interviewId) {
        long userId = CurrentUserContext.requireUserId();
        InterviewSessionEntity session = interviewSessionMapper.selectOneById(interviewId);
        if (session == null || !Long.valueOf(userId).equals(session.getUserId())) {
            throw new AppException(HttpStatus.NOT_FOUND, "Interview not found");
        }
        return session;
    }

    private ResumeEntity requireActiveResume(String resumeId, long userId) {
        ResumeEntity resume = resumeMapper.selectOneById(resumeId);
        if (resume == null || !Long.valueOf(userId).equals(resume.getUserId())) {
            throw new AppException(HttpStatus.NOT_FOUND, "Resume not found");
        }
        if (Boolean.TRUE.equals(resume.getDeleted())) {
            throw new AppException(HttpStatus.CONFLICT, "Resume has been deleted");
        }
        return resume;
    }

    private void requireStatus(InterviewSessionEntity session, String expectedStatus, String message) {
        if (!expectedStatus.equals(session.getStatus())) {
            throw new AppException(HttpStatus.CONFLICT, message);
        }
    }

    private void accumulateElapsedTime(InterviewSessionEntity session, LocalDateTime now) {
        if (session.getLastResumedAt() != null) {
            long secondsElapsed = java.time.Duration.between(session.getLastResumedAt(), now).getSeconds();
            int current = session.getTotalElapsedSeconds() == null ? 0 : session.getTotalElapsedSeconds();
            session.setTotalElapsedSeconds(current + (int) Math.max(0, secondsElapsed));
        }
        session.setLastResumedAt(null);
    }

    private void updateSessionWithNulls(InterviewSessionEntity session) {
        interviewSessionMapper.update(session, false);
    }

    private String normalizeDifficulty(String difficulty) {
        String normalized = difficulty.trim().toUpperCase(Locale.ROOT);
        if (!DIFFICULTIES.contains(normalized)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Interview difficulty must be EASY, MEDIUM, or HARD");
        }
        return normalized;
    }

    private List<String> normalizeInterviewerRoles(List<String> interviewerRoles) {
        List<String> roles = interviewerRoles == null ? List.of() : interviewerRoles.stream()
            .map(this::normalizeOptionalText)
            .filter(role -> role != null)
            .toList();
        if (roles.isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "At least one interviewer role is required");
        }
        return List.copyOf(roles);
    }

    private String normalizeOptionalStatus(String status) {
        String normalized = normalizeOptionalText(status);
        if (normalized == null) {
            return null;
        }
        normalized = normalized.toUpperCase(Locale.ROOT);
        if (!STATUSES.contains(normalized)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Interview status is invalid");
        }
        return normalized;
    }

    private String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private boolean companyContextEnabled(InterviewSessionEntity session) {
        return COMPANY_CONTEXT_READY.equals(normalizeCompanyContextStatus(session.getCompanyContextStatus()))
            && session.getTargetCompany() != null
            && !readCompanyContextSummary(session).isEmpty();
    }

    private String normalizeCompanyContextStatus(String status) {
        String normalized = normalizeOptionalText(status);
        if (normalized == null) {
            return COMPANY_CONTEXT_NOT_REQUESTED;
        }
        normalized = normalized.toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case COMPANY_CONTEXT_READY, COMPANY_CONTEXT_FAILED, COMPANY_CONTEXT_NOT_REQUESTED -> normalized;
            default -> COMPANY_CONTEXT_NOT_REQUESTED;
        };
    }

    private void appendMessage(InterviewSessionEntity session, String role, String content, int sortOrder, LocalDateTime createdAt) {
        InterviewMessageEntity message = new InterviewMessageEntity();
        message.setId(UUID.randomUUID().toString());
        message.setUserId(session.getUserId());
        message.setSessionId(session.getId());
        message.setRole(role);
        message.setContent(content);
        message.setSortOrder(sortOrder);
        message.setRoundIndex(currentRoundIndex(session));
        message.setCreatedAt(createdAt);
        message.setStatus("NORMAL");
        interviewMessageMapper.insert(message);
        appendChatMemoryMessage(buildRoundConversationId(session.getId(), currentRoundIndex(session)), role, content);
    }

    private void persistMessage(InterviewSessionEntity session, String role, String content, int sortOrder, LocalDateTime createdAt) {
        persistMessageWithStatus(session, role, content, sortOrder, createdAt, "NORMAL");
    }

    private void persistMessageWithStatus(InterviewSessionEntity session, String role, String content, int sortOrder, LocalDateTime createdAt, String status) {
        InterviewMessageEntity message = new InterviewMessageEntity();
        message.setId(UUID.randomUUID().toString());
        message.setUserId(session.getUserId());
        message.setSessionId(session.getId());
        message.setRole(role);
        message.setContent(content);
        message.setSortOrder(sortOrder);
        message.setRoundIndex(currentRoundIndex(session));
        message.setCreatedAt(createdAt);
        message.setStatus(status);
        interviewMessageMapper.insert(message);
    }

    private List<InterviewMessageEntity> listMessageEntities(String sessionId, long userId) {
        InterviewMessageEntityTableDef messageTable = InterviewMessageEntityTableDef.INTERVIEW_MESSAGE_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(messageTable.SESSION_ID.eq(sessionId))
            .and(messageTable.USER_ID.eq(userId))
            .orderBy(messageTable.SORT_ORDER, true);
        return interviewMessageMapper.selectListByQuery(query);
    }

    private List<InterviewMessageResponse> listMessages(InterviewSessionEntity session) {
        return listMessageEntities(session.getId(), session.getUserId()).stream()
            .sorted(Comparator.comparing(InterviewMessageEntity::getSortOrder))
            .map(message -> new InterviewMessageResponse(
                message.getId(),
                message.getRole(),
                message.getContent(),
                message.getSortOrder() == null ? 0 : message.getSortOrder(),
                message.getRoundIndex() == null ? 0 : message.getRoundIndex(),
                message.getCreatedAt(),
                message.getStatus()
            ))
            .toList();
    }

    private String generateAiResponse(InterviewSessionEntity session, ResumeEntity resume, String userMessage, int currentQuestionCount) {
        return generateAiResponse(session, resume, userMessage, currentQuestionCount, List.of());
    }

    private String generateAiResponse(InterviewSessionEntity session, ResumeEntity resume, String userMessage, int currentQuestionCount, List<String> previousRoundTopics) {
        List<String> roles = readInterviewerRoles(session);
        int roundIndex = currentRoundIndex(session);
        String currentRole = roles.get(roundIndex);

        String resumeJson = resume != null && resume.getLayoutJson() != null ? resume.getLayoutJson() : "{}";

        String systemPrompt = InterviewPromptBuilder.buildSystemPrompt(
            currentRole,
            session.getDifficulty(),
            resumeJson,
            session.getJobDescription(),
            companyContextEnabled(session) ? session.getTargetCompany() : null,
            companyContextEnabled(session) ? readCompanyContextSummary(session) : List.of(),
            currentQuestionCount,
            MAX_QUESTIONS_PER_ROUND,
            previousRoundTopics
        );

        String conversationId = buildRoundConversationId(session.getId(), roundIndex);
        AiInvocationRequest invocationRequest = new AiInvocationRequest(
            systemPrompt,
            userMessage,
            conversationId
        );

        try {
            return aiChatService.call(invocationRequest);
        } catch (Exception e) {
            log.error("AI call failed for interview session {} (conversationId={}): {}",
                session.getId(), conversationId, e.getMessage());
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "AI 服务暂时不可用，请稍后重试");
        }
    }

    private int countQuestionsInCurrentRound(List<InterviewMessageEntity> allMessages, Integer activeRoundIndex) {
        int roundIndex = activeRoundIndex == null ? 0 : activeRoundIndex;
        return (int) allMessages.stream()
            .filter(msg -> "INTERVIEWER".equals(msg.getRole()))
            .filter(msg -> {
                Integer messageRound = msg.getRoundIndex();
                return messageRound != null && messageRound == roundIndex;
            })
            .count();
    }

    private InterviewSummaryResponse toSummary(InterviewSessionEntity session) {
        ResumeEntity resume = loadOwnedResumeForSession(session);
        return new InterviewSummaryResponse(
            session.getId(),
            session.getResumeId(),
            resume == null ? null : resume.getTitle(),
            session.getAiConversationId(),
            session.getTitle(),
            session.getJobDescription(),
            session.getTargetCompany(),
            session.getDifficulty(),
            readInterviewerRoles(session),
            readCompanyContextSummary(session),
            normalizeCompanyContextStatus(session.getCompanyContextStatus()),
            currentRoundIndex(session),
            session.getStatus(),
            session.getReportStatus(),
            session.getCreatedAt(),
            session.getUpdatedAt(),
            session.getEndedAt()
        );
    }

    private InterviewDetailResponse toDetail(InterviewSessionEntity session, List<InterviewMessageResponse> messages) {
        ResumeEntity resume = loadOwnedResumeForSession(session);
        long totalElapsed = session.getTotalElapsedSeconds() == null ? 0L : session.getTotalElapsedSeconds();
        return new InterviewDetailResponse(
            session.getId(),
            session.getResumeId(),
            resume == null ? null : resume.getTitle(),
            session.getAiConversationId(),
            session.getTitle(),
            session.getJobDescription(),
            session.getTargetCompany(),
            session.getDifficulty(),
            readInterviewerRoles(session),
            readCompanyContextSummary(session),
            normalizeCompanyContextStatus(session.getCompanyContextStatus()),
            currentRoundIndex(session),
            session.getStatus(),
            session.getReportStatus(),
            session.getReportContent(),
            messages,
            totalElapsed,
            session.getLastResumedAt(),
            session.getCreatedAt(),
            session.getUpdatedAt(),
            session.getEndedAt()
        );
    }

    private String toJson(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values);
        } catch (JsonProcessingException exception) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to serialize interviewer roles");
        }
    }

    private List<String> readInterviewerRoles(InterviewSessionEntity session) {
        String json = session.getInterviewerRolesJson();
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {
            });
        } catch (Exception exception) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to parse interviewer roles");
        }
    }

    private List<String> readCompanyContextSummary(InterviewSessionEntity session) {
        String json = session.getCompanyContextSummaryJson();
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<String> values = objectMapper.readValue(json, new TypeReference<List<String>>() {
            });
            return normalizeCompanyContextSummary(values);
        } catch (Exception exception) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to parse company context summary");
        }
    }

    private int currentRoundIndex(InterviewSessionEntity session) {
        List<String> roles = readInterviewerRoles(session);
        if (roles.isEmpty()) {
            return 0;
        }
        int index = session.getActiveRoundIndex() == null ? 0 : session.getActiveRoundIndex();
        return Math.min(Math.max(index, 0), roles.size() - 1);
    }

    private String buildRoundConversationId(String sessionId, int roundIndex) {
        return "interview-" + sessionId + "-round-" + roundIndex;
    }

    private List<String> extractRoundTopics(InterviewSessionEntity session, int roundIndex) {
        List<InterviewMessageEntity> allMessages = listMessageEntities(session.getId(), session.getUserId());
        List<InterviewMessageEntity> roundMessages = allMessages.stream()
            .filter(msg -> msg.getRoundIndex() != null && msg.getRoundIndex() == roundIndex)
            .toList();

        if (roundMessages.isEmpty()) {
            return List.of();
        }

        StringBuilder conversation = new StringBuilder();
        for (InterviewMessageEntity msg : roundMessages) {
            conversation.append(msg.getRole()).append(": ").append(msg.getContent()).append("\n");
        }

        String extractionPrompt = """
            请从以下面试对话中提取“已经完成提问并得到候选人回答”的具体技术栈关键词（如 Spring Boot, Redis, MySQL, Docker 等）。

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

        String extractConversationId = "interview-" + session.getId() + "-extract-" + roundIndex;
        AiInvocationRequest extractionRequest = new AiInvocationRequest(
            "你是一个严格的面试问题技术栈提取助手。只有“面试官明确提问且候选人已经回答”的技术栈才可进入结果；只返回JSON对象。",
            extractionPrompt,
            extractConversationId
        );

        try {
            RoundTopicExtractionResult response = aiChatService.callStructured(
                extractionRequest,
                RoundTopicExtractionResult.class
            );
            return normalizeExtractedTopics(response == null ? null : response.topics());
        } catch (Exception e) {
            log.warn("AI topic extraction failed for session {} round {}: {}",
                session.getId(), roundIndex, e.getMessage());
            return List.of();
        }
    }

    private List<String> extractCompanyContextSummary(String targetCompany, InterviewSessionEntity session, ResumeEntity resume) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("请围绕目标公司生成 2 到 3 条适合用于面试上下文注入的摘要。要求：\n");
        prompt.append("1. 只输出 JSON 对象，格式必须是 {\"summary\":[\"...\",\"...\"]}。\n");
        prompt.append("2. 重点提炼公司主营业务、行业特点、技术或组织特征，便于面试官偶尔结合业务场景提问。\n");
        prompt.append("3. 摘要要稳健，不要编造具体营收、最新组织变化或无法确认的细节。\n");
        prompt.append("4. 每条摘要控制在 18 到 36 个中文字符左右，避免空泛口号。\n");
        prompt.append("5. 如果把握不足，也尽量给出行业层面的稳妥描述；若仍无法判断，返回 {\"summary\":[]}。\n");
        prompt.append("目标公司：").append(targetCompany).append("\n");
        if (session.getJobDescription() != null && !session.getJobDescription().isBlank()) {
            prompt.append("岗位 JD：").append(session.getJobDescription()).append("\n");
        }
        if (resume != null && resume.getLayoutJson() != null && !resume.getLayoutJson().isBlank()) {
            prompt.append("候选人简历（供判断匹配场景参考）：").append(resume.getLayoutJson()).append("\n");
        }

        AiInvocationRequest request = new AiInvocationRequest(
            "你是一名谨慎的公司背景提炼助手。请输出适合技术面试上下文注入的精炼摘要，只返回 JSON。",
            prompt.toString(),
            AiConversationIdGenerator.generate(session.getId(), AiFeatureType.INTERVIEW)
        );

        try {
            CompanyContextSummaryResult response = aiChatService.callStructured(request, CompanyContextSummaryResult.class);
            return normalizeCompanyContextSummary(response == null ? null : response.summary());
        } catch (Exception exception) {
            log.warn("Failed to extract company context for session {} company {}: {}",
                session.getId(), targetCompany, exception.getMessage());
            return List.of();
        }
    }

    private List<String> normalizeExtractedTopics(List<String> topics) {
        if (topics == null || topics.isEmpty()) {
            return List.of();
        }
        Set<String> normalized = new LinkedHashSet<>();
        for (String topic : topics) {
            if (topic == null) {
                continue;
            }
            String trimmed = topic.trim();
            if (!trimmed.isEmpty()) {
                normalized.add(trimmed);
            }
        }
        return new ArrayList<>(normalized);
    }

    private List<String> normalizeCompanyContextSummary(List<String> summary) {
        if (summary == null || summary.isEmpty()) {
            return List.of();
        }
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String item : summary) {
            if (item == null) {
                continue;
            }
            String trimmed = item.trim();
            if (!trimmed.isEmpty()) {
                normalized.add(trimmed);
            }
            if (normalized.size() >= 3) {
                break;
            }
        }
        return new ArrayList<>(normalized);
    }

    private List<String> getPreviousRoundTopics(String sessionId, long userId, int currentRoundIndex) {
        InterviewRoundTopicEntityTableDef roundTopicTable = InterviewRoundTopicEntityTableDef.INTERVIEW_ROUND_TOPIC_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(roundTopicTable.SESSION_ID.eq(sessionId))
            .and(roundTopicTable.USER_ID.eq(userId))
            .and(roundTopicTable.ROUND_INDEX.lt(currentRoundIndex));
        List<InterviewRoundTopicEntity> entities = interviewRoundTopicMapper.selectListByQuery(query);

        Set<String> allTopics = new LinkedHashSet<>();
        for (InterviewRoundTopicEntity entity : entities) {
            try {
                List<String> topics = objectMapper.readValue(entity.getTopicsJson(), new TypeReference<List<String>>() {});
                allTopics.addAll(topics);
            } catch (Exception e) {
                log.warn("Failed to parse topics_json for session {} round {}: {}",
                    sessionId, entity.getRoundIndex(), e.getMessage());
            }
        }
        return new ArrayList<>(allTopics);
    }

    private void appendChatMemoryMessage(String conversationId, String role, String content) {
        List<Message> messages = new ArrayList<>(chatMemoryRepository.findByConversationId(conversationId));
        if ("CANDIDATE".equals(role)) {
            messages.add(new UserMessage(content));
        } else {
            messages.add(new AssistantMessage(content));
        }
        chatMemoryRepository.saveAll(conversationId, messages);
    }

    private ResumeEntity loadOwnedResumeForSession(InterviewSessionEntity session) {
        if (session.getResumeId() == null) {
            return null;
        }
        ResumeEntity resume = resumeMapper.selectOneById(session.getResumeId());
        if (resume == null || !Objects.equals(session.getUserId(), resume.getUserId())) {
            return null;
        }
        return resume;
    }
}
