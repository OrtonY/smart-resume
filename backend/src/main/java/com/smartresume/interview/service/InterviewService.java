package com.smartresume.interview.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mybatisflex.core.query.QueryWrapper;
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

import org.springframework.ai.chat.memory.repository.jdbc.JdbcChatMemoryRepository;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InterviewService {

    private static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
    private static final String STATUS_PAUSED = "PAUSED";
    private static final String STATUS_ENDED = "ENDED";
    private static final String REPORT_PENDING = "PENDING";
    private static final String REPORT_READY = "READY";
    private static final Set<String> DIFFICULTIES = Set.of("EASY", "MEDIUM", "HARD");
    private static final Set<String> STATUSES = Set.of(STATUS_IN_PROGRESS, STATUS_PAUSED, STATUS_ENDED);

    private final InterviewSessionMapper interviewSessionMapper;
    private final InterviewMessageMapper interviewMessageMapper;
    private final ResumeMapper resumeMapper;
    private final ObjectMapper objectMapper;
    private final JdbcChatMemoryRepository chatMemoryRepository;

    public InterviewService(
        InterviewSessionMapper interviewSessionMapper,
        InterviewMessageMapper interviewMessageMapper,
        ResumeMapper resumeMapper,
        ObjectMapper objectMapper,
        JdbcChatMemoryRepository chatMemoryRepository
    ) {
        this.interviewSessionMapper = interviewSessionMapper;
        this.interviewMessageMapper = interviewMessageMapper;
        this.resumeMapper = resumeMapper;
        this.objectMapper = objectMapper;
        this.chatMemoryRepository = chatMemoryRepository;
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
                || session.getJobDescription().toLowerCase(Locale.ROOT).contains(normalizedKeyword))
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
        ResumeEntity resume = resumeId == null ? null : requireActiveResume(resumeId);
        LocalDateTime now = LocalDateTime.now();

        InterviewSessionEntity session = new InterviewSessionEntity();
        session.setId(UUID.randomUUID().toString());
        session.setResumeId(resume == null ? null : resume.getId());
        session.setTitle(request.title().trim());
        session.setAiConversationId("interview-" + session.getId());
        session.setJobDescription(request.jobDescription().trim());
        session.setDifficulty(normalizeDifficulty(request.difficulty()));
        session.setInterviewerRolesJson(toJson(normalizeInterviewerRoles(request.interviewerRoles())));
        session.setActiveRoundIndex(0);
        session.setStatus(STATUS_IN_PROGRESS);
        session.setReportStatus(REPORT_PENDING);
        session.setCreatedAt(now);
        session.setUpdatedAt(now);
        interviewSessionMapper.insert(session);

        appendMessage(session, "INTERVIEWER", buildOpeningMessage(session, resume), 1, now);
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
        appendMessage(session, "INTERVIEWER", buildRoundOpeningMessage(session, currentIndex + 1), nextOrder, now.plusNanos(1));
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
        appendMessage(session, "INTERVIEWER", buildFollowUpMessage(session, request.content()), nextOrder + 1, now.plusNanos(1));

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
        session.setReportStatus(REPORT_READY);
        session.setReportContent(buildReportPlaceholder(session));
        session.setEndedAt(now);
        session.setUpdatedAt(now);
        interviewSessionMapper.update(session);
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

    private String buildOpeningMessage(InterviewSessionEntity session, ResumeEntity resume) {
        String resumeHint = resume == null ? "本次面试未绑定简历。" : "本次面试已绑定简历《" + resume.getTitle() + "》。";
        List<String> roles = readInterviewerRoles(session);
        int roundIndex = Math.min(Math.max(session.getActiveRoundIndex() == null ? 0 : session.getActiveRoundIndex(), 0), roles.size() - 1);
        String currentRole = roles.get(roundIndex);
        return "你好，我会以第 " + (roundIndex + 1) + " 轮「" + currentRole + "」视角进行"
            + difficultyLabel(session.getDifficulty())
            + "面试。"
            + resumeHint
            + "请先做一个简短自我介绍，并结合 JD 说明你最匹配的经历。";
    }

    private String buildRoundOpeningMessage(InterviewSessionEntity session, int roundIndex) {
        List<String> roles = readInterviewerRoles(session);
        String currentRole = roles.get(roundIndex);
        return "现在进入第 " + (roundIndex + 1) + " 轮「" + currentRole + "」面试。"
            + "我会基于该角色定位继续追问，请结合前面的回答和 JD 补充说明你最能体现匹配度的一段经历。";
    }

    private String buildFollowUpMessage(InterviewSessionEntity session, String candidateAnswer) {
        String answer = candidateAnswer == null ? "" : candidateAnswer.trim();
        String focus = answer.length() > 80 ? answer.substring(0, 80) + "..." : answer;
        if (focus.isBlank()) {
            focus = "你的上一条回答";
        }
        return "占位追问：围绕「" + focus + "」，请补充一个更具体的项目细节、你的决策过程和可量化结果。";
    }

    private String buildReportPlaceholder(InterviewSessionEntity session) {
        return "占位面试报告\n\n"
            + "面试标题：" + session.getTitle() + "\n"
            + "面试官角色：" + String.join("、", readInterviewerRoles(session)) + "\n"
            + "当前轮次：" + (Math.min(Math.max(session.getActiveRoundIndex() == null ? 0 : session.getActiveRoundIndex(), 0), Math.max(readInterviewerRoles(session).size() - 1, 0)) + 1) + "\n"
            + "难度：" + difficultyLabel(session.getDifficulty()) + "\n\n"
            + "当前版本暂未接入 AI 评分。后续报告将基于面试对话、JD、难度和可选简历上下文生成优势、风险点和改进建议。";
    }

    private String difficultyLabel(String difficulty) {
        return switch (difficulty) {
            case "EASY" -> "简单";
            case "HARD" -> "困难";
            default -> "中等";
        };
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
