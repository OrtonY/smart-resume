package com.smartresume.interview.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.ai.service.AiChatService;
import com.smartresume.common.exception.AppException;
import com.smartresume.interview.domain.InterviewMessageEntity;
import com.smartresume.interview.domain.InterviewSessionEntity;
import com.smartresume.interview.dto.InterviewDtos.InterviewCreateRequest;
import com.smartresume.interview.dto.InterviewDtos.InterviewDetailResponse;
import com.smartresume.interview.dto.InterviewDtos.InterviewMessageRequest;
import com.smartresume.interview.dto.InterviewDtos.InterviewMessageResponse;
import com.smartresume.interview.dto.InterviewDtos.InterviewPageResponse;
import com.smartresume.interview.dto.InterviewDtos.InterviewSummaryResponse;
import com.smartresume.interview.mapper.InterviewMessageMapper;
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

@Service
public class InterviewService {

    private static final Logger log = LoggerFactory.getLogger(InterviewService.class);

    private static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
    private static final String STATUS_PAUSED = "PAUSED";
    private static final String STATUS_ENDED = "ENDED";
    private static final String REPORT_PENDING = "PENDING";
    private static final String REPORT_READY = "READY";
    private static final Set<String> DIFFICULTIES = Set.of("EASY", "MEDIUM", "HARD");
    private static final Set<String> STATUSES = Set.of(STATUS_IN_PROGRESS, STATUS_PAUSED, STATUS_ENDED);
    private static final int MAX_QUESTIONS_PER_ROUND = 18;

    private final InterviewSessionMapper interviewSessionMapper;
    private final InterviewMessageMapper interviewMessageMapper;
    private final ResumeMapper resumeMapper;
    private final ObjectMapper objectMapper;
    private final JdbcChatMemoryRepository chatMemoryRepository;
    private final AiChatService aiChatService;
    private final InterviewReportService interviewReportService;

    public InterviewService(
        InterviewSessionMapper interviewSessionMapper,
        InterviewMessageMapper interviewMessageMapper,
        ResumeMapper resumeMapper,
        ObjectMapper objectMapper,
        JdbcChatMemoryRepository chatMemoryRepository,
        AiChatService aiChatService,
        InterviewReportService interviewReportService
    ) {
        this.interviewSessionMapper = interviewSessionMapper;
        this.interviewMessageMapper = interviewMessageMapper;
        this.resumeMapper = resumeMapper;
        this.objectMapper = objectMapper;
        this.chatMemoryRepository = chatMemoryRepository;
        this.aiChatService = aiChatService;
        this.interviewReportService = interviewReportService;
    }

    public InterviewPageResponse listInterviews(String resumeId, String status, String keyword, int page, int pageSize) {
        int safePage = Math.max(1, page);
        int safePageSize = Math.max(1, pageSize);
        String normalizedStatus = normalizeOptionalStatus(status);
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);

        List<InterviewSessionEntity> filtered = interviewSessionMapper.selectAll().stream()
            .filter(session -> resumeId == null || resumeId.isBlank() || resumeId.equals(session.getResumeId()))
            .filter(session -> normalizedStatus == null || normalizedStatus.equals(session.getStatus()))
            .filter(session -> normalizedKeyword.isBlank()
                || session.getTitle().toLowerCase(Locale.ROOT).contains(normalizedKeyword)
                || (session.getJobDescription() != null && session.getJobDescription().toLowerCase(Locale.ROOT).contains(normalizedKeyword)))
            .sorted(Comparator.comparing(InterviewSessionEntity::getUpdatedAt).reversed())
            .toList();

        int fromIndex = Math.min((safePage - 1) * safePageSize, filtered.size());
        int toIndex = Math.min(fromIndex + safePageSize, filtered.size());
        List<InterviewSummaryResponse> items = filtered.subList(fromIndex, toIndex).stream()
            .map(this::toSummary)
            .toList();
        int totalPages = Math.max(1, (int) Math.ceil((double) filtered.size() / safePageSize));

        return new InterviewPageResponse(
            items,
            filtered.size(),
            safePage,
            safePageSize,
            totalPages
        );
    }

    @Transactional
    public InterviewDetailResponse createInterview(InterviewCreateRequest request) {
        String resumeId = normalizeOptionalText(request.resumeId());
        String jobDescription = normalizeOptionalText(request.jobDescription());

        if (resumeId == null && jobDescription == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "简历和 JD 至少填写一个");
        }

        ResumeEntity resume = resumeId != null ? requireActiveResume(resumeId) : null;
        LocalDateTime now = LocalDateTime.now();

        InterviewSessionEntity session = new InterviewSessionEntity();
        session.setId(UUID.randomUUID().toString());
        session.setResumeId(resume != null ? resume.getId() : null);
        session.setTitle(request.title().trim());
        session.setAiConversationId("interview-" + session.getId());
        session.setJobDescription(jobDescription);
        session.setDifficulty(normalizeDifficulty(request.difficulty()));
        session.setInterviewerRolesJson(toJson(normalizeInterviewerRoles(request.interviewerRoles())));
        session.setActiveRoundIndex(0);
        session.setStatus(STATUS_IN_PROGRESS);
        session.setReportStatus(REPORT_PENDING);
        session.setCreatedAt(now);
        session.setUpdatedAt(now);
        interviewSessionMapper.insert(session);

        String openingMessage = generateAiResponse(session, resume, "请开始第一轮面试，先做简短自我介绍然后提出第一个面试问题。", 0);
        appendMessage(session, "INTERVIEWER", openingMessage, 1, now);
        return getInterview(session.getId());
    }

    public InterviewDetailResponse getInterview(String interviewId) {
        InterviewSessionEntity session = requireSession(interviewId);
        return toDetail(session, listMessages(session.getId()));
    }

    @Transactional
    public InterviewDetailResponse pauseInterview(String interviewId) {
        InterviewSessionEntity session = requireSession(interviewId);
        requireStatus(session, STATUS_IN_PROGRESS, "Only in-progress interviews can be paused");
        session.setStatus(STATUS_PAUSED);
        session.setUpdatedAt(LocalDateTime.now());
        interviewSessionMapper.update(session);
        return getInterview(session.getId());
    }

    @Transactional
    public InterviewDetailResponse continueInterview(String interviewId) {
        InterviewSessionEntity session = requireSession(interviewId);
        requireStatus(session, STATUS_PAUSED, "Only paused interviews can be continued");
        session.setStatus(STATUS_IN_PROGRESS);
        session.setUpdatedAt(LocalDateTime.now());
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
        int nextOrder = listMessageEntities(session.getId()).stream()
            .map(InterviewMessageEntity::getSortOrder)
            .filter(Objects::nonNull)
            .max(Integer::compareTo)
            .orElse(0) + 1;

        session.setActiveRoundIndex(currentIndex + 1);
        session.setUpdatedAt(now);
        interviewSessionMapper.update(session);

        ResumeEntity resume = session.getResumeId() != null ? requireActiveResume(session.getResumeId()) : null;
        String roundOpeningMessage = generateAiResponse(session, resume,
            "你是新一轮的面试官，请做简短自我介绍并提出第一个面试问题。", 0);
        appendMessage(session, "INTERVIEWER", roundOpeningMessage, nextOrder, now.plusNanos(1));
        return getInterview(session.getId());
    }

    @Transactional
    public InterviewDetailResponse submitMessage(String interviewId, InterviewMessageRequest request) {
        InterviewSessionEntity session = requireSession(interviewId);
        requireStatus(session, STATUS_IN_PROGRESS, "Only in-progress interviews accept new messages");

        List<InterviewMessageEntity> currentMessages = listMessageEntities(session.getId());
        int nextOrder = currentMessages.stream()
            .map(InterviewMessageEntity::getSortOrder)
            .filter(Objects::nonNull)
            .max(Integer::compareTo)
            .orElse(0) + 1;
        LocalDateTime now = LocalDateTime.now();

        appendMessage(session, "CANDIDATE", request.content().trim(), nextOrder, now);

        int questionCount = countQuestionsInCurrentRound(currentMessages, session.getActiveRoundIndex());
        ResumeEntity resume = session.getResumeId() != null ? requireActiveResume(session.getResumeId()) : null;
        String aiResponse = generateAiResponse(session, resume, request.content().trim(), questionCount);
        appendMessage(session, "INTERVIEWER", aiResponse, nextOrder + 1, now.plusNanos(1));

        session.setUpdatedAt(now);
        interviewSessionMapper.update(session);
        return getInterview(session.getId());
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
        session.setStatus(STATUS_ENDED);
        session.setReportStatus(REPORT_PENDING);
        session.setEndedAt(now);
        session.setUpdatedAt(now);
        interviewSessionMapper.update(session);

        interviewReportService.generateReportAsync(session.getId());

        return getInterview(session.getId());
    }

    private InterviewSessionEntity requireSession(String interviewId) {
        InterviewSessionEntity session = interviewSessionMapper.selectOneById(interviewId);
        if (session == null) {
            throw new AppException(HttpStatus.NOT_FOUND, "Interview not found");
        }
        return session;
    }

    private ResumeEntity requireActiveResume(String resumeId) {
        ResumeEntity resume = resumeMapper.selectOneById(resumeId);
        if (resume == null) {
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

    private void appendMessage(InterviewSessionEntity session, String role, String content, int sortOrder, LocalDateTime createdAt) {
        InterviewMessageEntity message = new InterviewMessageEntity();
        message.setId(UUID.randomUUID().toString());
        message.setSessionId(session.getId());
        message.setRole(role);
        message.setContent(content);
        message.setSortOrder(sortOrder);
        message.setCreatedAt(createdAt);
        interviewMessageMapper.insert(message);
        appendChatMemoryMessage(session.getAiConversationId(), role, content);
    }

    private List<InterviewMessageEntity> listMessageEntities(String sessionId) {
        QueryWrapper query = QueryWrapper.create()
            .where("session_id = ?", sessionId)
            .orderBy("sort_order", true);
        return interviewMessageMapper.selectListByQuery(query);
    }

    private List<InterviewMessageResponse> listMessages(String sessionId) {
        return listMessageEntities(sessionId).stream()
            .sorted(Comparator.comparing(InterviewMessageEntity::getSortOrder))
            .map(message -> new InterviewMessageResponse(
                message.getId(),
                message.getRole(),
                message.getContent(),
                message.getSortOrder() == null ? 0 : message.getSortOrder(),
                message.getCreatedAt()
            ))
            .toList();
    }

    private String generateAiResponse(InterviewSessionEntity session, ResumeEntity resume, String userMessage, int currentQuestionCount) {
        List<String> roles = readInterviewerRoles(session);
        int roundIndex = currentRoundIndex(session);
        String currentRole = roles.get(roundIndex);

        String resumeJson = resume != null && resume.getLayoutJson() != null ? resume.getLayoutJson() : "{}";

        String systemPrompt = InterviewPromptBuilder.buildSystemPrompt(
            currentRole,
            session.getDifficulty(),
            resumeJson,
            session.getJobDescription(),
            currentQuestionCount,
            MAX_QUESTIONS_PER_ROUND
        );

        AiInvocationRequest invocationRequest = new AiInvocationRequest(
            systemPrompt,
            userMessage,
            session.getAiConversationId()
        );

        try {
            return aiChatService.call(invocationRequest);
        } catch (Exception e) {
            log.error("AI call failed for interview session {} (conversationId={}): {}",
                session.getId(), session.getAiConversationId(), e.getMessage());
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "AI 服务暂时不可用，请稍后重试");
        }
    }

    private int countQuestionsInCurrentRound(List<InterviewMessageEntity> allMessages, Integer activeRoundIndex) {
        int roundIndex = activeRoundIndex == null ? 0 : activeRoundIndex;

        if (allMessages.isEmpty()) {
            return 0;
        }

        // Find the start index of the current round in the message list.
        // Round boundaries: the first message is always round 0's opener.
        // Subsequent round openers are INTERVIEWER messages preceded by another INTERVIEWER message
        // (because submitMessage always ends with an INTERVIEWER response, then nextRound adds another).
        int currentRound = 0;
        int roundStartIndex = 0;

        for (int i = 1; i < allMessages.size() && currentRound < roundIndex; i++) {
            if ("INTERVIEWER".equals(allMessages.get(i).getRole())
                && "INTERVIEWER".equals(allMessages.get(i - 1).getRole())) {
                currentRound++;
                roundStartIndex = i;
            }
        }

        return (int) allMessages.subList(roundStartIndex, allMessages.size()).stream()
            .filter(msg -> "INTERVIEWER".equals(msg.getRole()))
            .count();
    }

    private InterviewSummaryResponse toSummary(InterviewSessionEntity session) {
        ResumeEntity resume = session.getResumeId() == null ? null : resumeMapper.selectOneById(session.getResumeId());
        return new InterviewSummaryResponse(
            session.getId(),
            session.getResumeId(),
            resume == null ? null : resume.getTitle(),
            session.getAiConversationId(),
            session.getTitle(),
            session.getJobDescription(),
            session.getDifficulty(),
            readInterviewerRoles(session),
            currentRoundIndex(session),
            session.getStatus(),
            session.getReportStatus(),
            session.getCreatedAt(),
            session.getUpdatedAt(),
            session.getEndedAt()
        );
    }

    private InterviewDetailResponse toDetail(InterviewSessionEntity session, List<InterviewMessageResponse> messages) {
        ResumeEntity resume = session.getResumeId() == null ? null : resumeMapper.selectOneById(session.getResumeId());
        return new InterviewDetailResponse(
            session.getId(),
            session.getResumeId(),
            resume == null ? null : resume.getTitle(),
            session.getAiConversationId(),
            session.getTitle(),
            session.getJobDescription(),
            session.getDifficulty(),
            readInterviewerRoles(session),
            currentRoundIndex(session),
            session.getStatus(),
            session.getReportStatus(),
            session.getReportContent(),
            messages,
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

    private int currentRoundIndex(InterviewSessionEntity session) {
        List<String> roles = readInterviewerRoles(session);
        if (roles.isEmpty()) {
            return 0;
        }
        int index = session.getActiveRoundIndex() == null ? 0 : session.getActiveRoundIndex();
        return Math.min(Math.max(index, 0), roles.size() - 1);
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
}
