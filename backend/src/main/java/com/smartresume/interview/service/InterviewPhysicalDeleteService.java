package com.smartresume.interview.service;

import com.mybatisflex.core.query.QueryColumn;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.ai.service.AiChatConversationCleanupService;
import com.smartresume.ai.service.AiChatMemoryArchiveService;
import com.smartresume.common.exception.AppException;
import com.smartresume.interview.domain.InterviewSessionEntity;
import com.smartresume.interview.domain.table.InterviewAiAssistEntityTableDef;
import com.smartresume.interview.domain.table.InterviewMessageEntityTableDef;
import com.smartresume.interview.domain.table.InterviewRoundTopicEntityTableDef;
import com.smartresume.interview.domain.table.InterviewSessionEntityTableDef;
import com.smartresume.interview.mapper.InterviewAiAssistMapper;
import com.smartresume.interview.mapper.InterviewMessageMapper;
import com.smartresume.interview.mapper.InterviewRoundTopicMapper;
import com.smartresume.interview.mapper.InterviewSessionMapper;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class InterviewPhysicalDeleteService {

    private final InterviewSessionMapper interviewSessionMapper;
    private final InterviewMessageMapper interviewMessageMapper;
    private final InterviewRoundTopicMapper interviewRoundTopicMapper;
    private final InterviewAiAssistMapper interviewAiAssistMapper;
    private final AiChatMemoryArchiveService aiChatMemoryArchiveService;

    public InterviewPhysicalDeleteService(
        InterviewSessionMapper interviewSessionMapper,
        InterviewMessageMapper interviewMessageMapper,
        InterviewRoundTopicMapper interviewRoundTopicMapper,
        InterviewAiAssistMapper interviewAiAssistMapper,
        AiChatMemoryArchiveService aiChatMemoryArchiveService
    ) {
        this.interviewSessionMapper = interviewSessionMapper;
        this.interviewMessageMapper = interviewMessageMapper;
        this.interviewRoundTopicMapper = interviewRoundTopicMapper;
        this.interviewAiAssistMapper = interviewAiAssistMapper;
        this.aiChatMemoryArchiveService = aiChatMemoryArchiveService;
    }

    public void deleteOwnedInterview(String interviewId, long userId) {
        InterviewSessionEntity session = findOwnedSession(interviewId, userId);
        if (session == null) {
            throw new AppException(HttpStatus.NOT_FOUND, "Interview not found");
        }
        deleteSession(session, userId, AiChatConversationCleanupService.REASON_MANUAL_DELETE);
    }

    public void deleteInterviewsForResume(String resumeId, long userId, String reason) {
        InterviewSessionEntityTableDef table = InterviewSessionEntityTableDef.INTERVIEW_SESSION_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(table.RESUME_ID.eq(resumeId))
            .and(table.USER_ID.eq(userId));
        List<InterviewSessionEntity> sessions = interviewSessionMapper.selectListByQuery(query);

        for (InterviewSessionEntity session : sessions) {
            deleteSession(session, userId, reason);
        }
    }

    private InterviewSessionEntity findOwnedSession(String interviewId, long userId) {
        InterviewSessionEntityTableDef table = InterviewSessionEntityTableDef.INTERVIEW_SESSION_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(table.ID.eq(interviewId))
            .and(table.USER_ID.eq(userId));
        return interviewSessionMapper.selectOneByQuery(query);
    }

    private void deleteSession(InterviewSessionEntity session, long userId, String reason) {
        archiveInterviewMemories(session, userId, reason);
        deleteAssists(session.getId(), userId);
        deleteRoundTopics(session.getId(), userId);
        deleteMessages(session.getId(), userId);
        deleteSessionRow(session.getId(), userId);
    }

    private void archiveInterviewMemories(InterviewSessionEntity session, long userId, String reason) {
        Set<String> conversationIds = new LinkedHashSet<>();
        if (session.getAiConversationId() != null && !session.getAiConversationId().isBlank()) {
            conversationIds.add(session.getAiConversationId());
        }
        conversationIds.addAll(aiChatMemoryArchiveService.findConversationIdsByPrefix("interview-" + session.getId() + "-"));
        conversationIds.addAll(aiChatMemoryArchiveService.findConversationIdsByPrefix(session.getId() + "_interview_"));
        aiChatMemoryArchiveService.archiveAndDeleteAll(conversationIds, userId, session.getResumeId(), reason);
    }

    private void deleteAssists(String sessionId, long userId) {
        InterviewAiAssistEntityTableDef table = InterviewAiAssistEntityTableDef.INTERVIEW_AI_ASSIST_ENTITY;
        interviewAiAssistMapper.deleteByQuery(sessionOwnedQuery(table.SESSION_ID, table.USER_ID, sessionId, userId));
    }

    private void deleteRoundTopics(String sessionId, long userId) {
        InterviewRoundTopicEntityTableDef table = InterviewRoundTopicEntityTableDef.INTERVIEW_ROUND_TOPIC_ENTITY;
        interviewRoundTopicMapper.deleteByQuery(sessionOwnedQuery(table.SESSION_ID, table.USER_ID, sessionId, userId));
    }

    private void deleteMessages(String sessionId, long userId) {
        InterviewMessageEntityTableDef table = InterviewMessageEntityTableDef.INTERVIEW_MESSAGE_ENTITY;
        interviewMessageMapper.deleteByQuery(sessionOwnedQuery(table.SESSION_ID, table.USER_ID, sessionId, userId));
    }

    private void deleteSessionRow(String sessionId, long userId) {
        InterviewSessionEntityTableDef table = InterviewSessionEntityTableDef.INTERVIEW_SESSION_ENTITY;
        interviewSessionMapper.deleteByQuery(sessionOwnedQuery(table.ID, table.USER_ID, sessionId, userId));
    }

    private QueryWrapper sessionOwnedQuery(
        QueryColumn sessionColumn,
        QueryColumn userColumn,
        String sessionId,
        long userId
    ) {
        return QueryWrapper.create()
            .where(sessionColumn.eq(sessionId))
            .and(userColumn.eq(userId));
    }
}
