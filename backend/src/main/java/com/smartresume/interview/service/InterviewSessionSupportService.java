package com.smartresume.interview.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.interview.domain.InterviewMessageEntity;
import com.smartresume.interview.domain.InterviewRoundTopicEntity;
import com.smartresume.interview.domain.InterviewSessionEntity;
import com.smartresume.interview.domain.table.InterviewMessageEntityTableDef;
import com.smartresume.interview.domain.table.InterviewRoundTopicEntityTableDef;
import com.smartresume.interview.dto.InterviewDtos.InterviewMessageResponse;
import com.smartresume.interview.mapper.InterviewMessageMapper;
import com.smartresume.interview.mapper.InterviewRoundTopicMapper;
import com.smartresume.interview.mapper.InterviewSessionMapper;
import com.smartresume.resume.domain.ResumeEntity;
import com.smartresume.resume.mapper.ResumeMapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.memory.repository.jdbc.JdbcChatMemoryRepository;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class InterviewSessionSupportService {

    private static final Logger log = LoggerFactory.getLogger(InterviewSessionSupportService.class);

    private final InterviewSessionMapper interviewSessionMapper;
    private final InterviewMessageMapper interviewMessageMapper;
    private final InterviewRoundTopicMapper interviewRoundTopicMapper;
    private final ResumeMapper resumeMapper;
    private final ObjectMapper objectMapper;
    private final JdbcChatMemoryRepository chatMemoryRepository;

    public InterviewSessionSupportService(
        InterviewSessionMapper interviewSessionMapper,
        InterviewMessageMapper interviewMessageMapper,
        InterviewRoundTopicMapper interviewRoundTopicMapper,
        ResumeMapper resumeMapper,
        ObjectMapper objectMapper,
        JdbcChatMemoryRepository chatMemoryRepository
    ) {
        this.interviewSessionMapper = interviewSessionMapper;
        this.interviewMessageMapper = interviewMessageMapper;
        this.interviewRoundTopicMapper = interviewRoundTopicMapper;
        this.resumeMapper = resumeMapper;
        this.objectMapper = objectMapper;
        this.chatMemoryRepository = chatMemoryRepository;
    }

    public InterviewSessionEntity requireSession(String interviewId) {
        long userId = CurrentUserContext.requireUserId();
        InterviewSessionEntity session = interviewSessionMapper.selectOneById(interviewId);
        if (session == null || !Long.valueOf(userId).equals(session.getUserId())) {
            throw new AppException(HttpStatus.NOT_FOUND, "Interview not found");
        }
        return session;
    }

    public InterviewMessageEntity requireInterviewerMessage(String messageId, InterviewSessionEntity session) {
        InterviewMessageEntityTableDef table = InterviewMessageEntityTableDef.INTERVIEW_MESSAGE_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(table.ID.eq(messageId))
            .and(table.SESSION_ID.eq(session.getId()))
            .and(table.USER_ID.eq(session.getUserId()));
        InterviewMessageEntity message = interviewMessageMapper.selectOneByQuery(query);
        if (message == null) {
            throw new AppException(HttpStatus.NOT_FOUND, "Message not found");
        }
        if (!"INTERVIEWER".equals(message.getRole())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Only interviewer messages support AI assist");
        }
        return message;
    }

    public ResumeEntity requireActiveResume(String resumeId, long userId) {
        ResumeEntity resume = resumeMapper.selectOneById(resumeId);
        if (resume == null || !Long.valueOf(userId).equals(resume.getUserId())) {
            throw new AppException(HttpStatus.NOT_FOUND, "Resume not found");
        }
        if (Boolean.TRUE.equals(resume.getDeleted())) {
            throw new AppException(HttpStatus.CONFLICT, "Resume has been deleted");
        }
        return resume;
    }

    public ResumeEntity loadOwnedResume(String resumeId, Long userId) {
        ResumeEntity resume = resumeMapper.selectOneById(resumeId);
        if (resume == null || !Objects.equals(userId, resume.getUserId())) {
            return null;
        }
        return resume;
    }

    public ResumeEntity loadOwnedResumeForSession(InterviewSessionEntity session) {
        if (session.getResumeId() == null) {
            return null;
        }
        return loadOwnedResume(session.getResumeId(), session.getUserId());
    }

    public void requireStatus(InterviewSessionEntity session, String expectedStatus, String message) {
        if (!expectedStatus.equals(session.getStatus())) {
            throw new AppException(HttpStatus.CONFLICT, message);
        }
    }

    public void accumulateElapsedTime(InterviewSessionEntity session, LocalDateTime now) {
        if (session.getLastResumedAt() != null) {
            long secondsElapsed = java.time.Duration.between(session.getLastResumedAt(), now).getSeconds();
            int current = session.getTotalElapsedSeconds() == null ? 0 : session.getTotalElapsedSeconds();
            session.setTotalElapsedSeconds(current + (int) Math.max(0, secondsElapsed));
        }
        session.setLastResumedAt(null);
    }

    public void updateSessionWithNulls(InterviewSessionEntity session) {
        interviewSessionMapper.update(session, false);
    }

    public void appendMessage(InterviewSessionEntity session, String role, String content, int sortOrder, LocalDateTime createdAt) {
        InterviewMessageEntity message = buildMessage(session, role, content, sortOrder, createdAt, "NORMAL");
        interviewMessageMapper.insert(message);
        appendChatMemoryMessage(buildRoundConversationId(session.getId(), currentRoundIndex(session)), role, content);
    }

    public void persistMessage(InterviewSessionEntity session, String role, String content, int sortOrder, LocalDateTime createdAt) {
        persistMessageWithStatus(session, role, content, sortOrder, createdAt, "NORMAL");
    }

    public void persistMessageWithStatus(
        InterviewSessionEntity session,
        String role,
        String content,
        int sortOrder,
        LocalDateTime createdAt,
        String status
    ) {
        interviewMessageMapper.insert(buildMessage(session, role, content, sortOrder, createdAt, status));
    }

    public List<InterviewMessageEntity> listMessageEntities(String sessionId, long userId) {
        InterviewMessageEntityTableDef messageTable = InterviewMessageEntityTableDef.INTERVIEW_MESSAGE_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(messageTable.SESSION_ID.eq(sessionId))
            .and(messageTable.USER_ID.eq(userId))
            .orderBy(messageTable.SORT_ORDER, true);
        return interviewMessageMapper.selectListByQuery(query);
    }

    public List<InterviewMessageResponse> listMessages(InterviewSessionEntity session) {
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

    public void saveRoundTopics(InterviewSessionEntity session, int roundIndex, List<String> topics) {
        if (topics == null || topics.isEmpty()) {
            return;
        }
        InterviewRoundTopicEntity topicEntity = new InterviewRoundTopicEntity();
        topicEntity.setId(UUID.randomUUID().toString());
        topicEntity.setUserId(session.getUserId());
        topicEntity.setSessionId(session.getId());
        topicEntity.setRoundIndex(roundIndex);
        topicEntity.setTopicsJson(toJson(topics));
        interviewRoundTopicMapper.insert(topicEntity);
    }

    public String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to serialize interview payload");
        }
    }

    public List<String> readInterviewerRoles(InterviewSessionEntity session) {
        return readInterviewerRoles(session, false);
    }

    public List<String> readInterviewerRolesBestEffort(InterviewSessionEntity session) {
        return readInterviewerRoles(session, true);
    }

    public List<String> readCompanyContextSummary(InterviewSessionEntity session) {
        return readCompanyContextSummary(session, false);
    }

    public List<String> readCompanyContextSummaryBestEffort(InterviewSessionEntity session) {
        return readCompanyContextSummary(session, true);
    }

    public int currentRoundIndex(InterviewSessionEntity session) {
        List<String> roles = readInterviewerRoles(session);
        if (roles.isEmpty()) {
            return 0;
        }
        int index = session.getActiveRoundIndex() == null ? 0 : session.getActiveRoundIndex();
        return Math.min(Math.max(index, 0), roles.size() - 1);
    }

    public String buildRoundConversationId(String sessionId, int roundIndex) {
        return "interview-" + sessionId + "-round-" + roundIndex;
    }

    public boolean companyContextEnabled(InterviewSessionEntity session) {
        return InterviewConstants.COMPANY_CONTEXT_READY.equals(normalizeCompanyContextStatus(session.getCompanyContextStatus()))
            && session.getTargetCompany() != null
            && !readCompanyContextSummaryBestEffort(session).isEmpty();
    }

    public String normalizeCompanyContextStatus(String status) {
        String normalized = normalizeOptionalText(status);
        if (normalized == null) {
            return InterviewConstants.COMPANY_CONTEXT_NOT_REQUESTED;
        }
        normalized = normalized.toUpperCase();
        return switch (normalized) {
            case InterviewConstants.COMPANY_CONTEXT_READY,
                InterviewConstants.COMPANY_CONTEXT_FAILED,
                InterviewConstants.COMPANY_CONTEXT_NOT_REQUESTED -> normalized;
            default -> InterviewConstants.COMPANY_CONTEXT_NOT_REQUESTED;
        };
    }

    public List<String> getPreviousRoundTopics(String sessionId, long userId, int currentRoundIndex) {
        return getPreviousRoundTopics(sessionId, userId, currentRoundIndex, false);
    }

    public List<String> getPreviousRoundTopicsBestEffort(String sessionId, long userId, int currentRoundIndex) {
        return getPreviousRoundTopics(sessionId, userId, currentRoundIndex, true);
    }

    private List<String> getPreviousRoundTopics(String sessionId, long userId, int currentRoundIndex, boolean bestEffort) {
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
                allTopics.addAll(normalizeDistinctValues(topics, Integer.MAX_VALUE));
            } catch (Exception exception) {
                if (!bestEffort) {
                    throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to parse interview round topics");
                }
                log.warn(
                    "Unable to parse interview round topics for session {} round {}: {}",
                    sessionId,
                    entity.getRoundIndex(),
                    exception.getMessage()
                );
            }
        }
        return new ArrayList<>(allTopics);
    }

    private List<String> readInterviewerRoles(InterviewSessionEntity session, boolean bestEffort) {
        String json = session.getInterviewerRolesJson();
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception exception) {
            if (!bestEffort) {
                throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to parse interviewer roles");
            }
            log.warn("Unable to parse interviewer roles for session {}: {}", session.getId(), exception.getMessage());
            return List.of();
        }
    }

    private List<String> readCompanyContextSummary(InterviewSessionEntity session, boolean bestEffort) {
        String json = session.getCompanyContextSummaryJson();
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return normalizeDistinctValues(
                objectMapper.readValue(json, new TypeReference<List<String>>() {}),
                InterviewConstants.MAX_COMPANY_CONTEXT_SUMMARY_ITEMS
            );
        } catch (Exception exception) {
            if (!bestEffort) {
                throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to parse company context summary");
            }
            log.warn("Unable to parse company context summary for session {}: {}", session.getId(), exception.getMessage());
            return List.of();
        }
    }

    private InterviewMessageEntity buildMessage(
        InterviewSessionEntity session,
        String role,
        String content,
        int sortOrder,
        LocalDateTime createdAt,
        String status
    ) {
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
        return message;
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

    private String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private List<String> normalizeDistinctValues(List<String> values, int maxItems) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
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
