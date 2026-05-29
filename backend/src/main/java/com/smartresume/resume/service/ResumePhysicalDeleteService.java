package com.smartresume.resume.service;

import com.mybatisflex.core.query.QueryColumn;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.ai.domain.table.AiChatMessageEntityTableDef;
import com.smartresume.ai.domain.table.AiResumeScoreEntityTableDef;
import com.smartresume.ai.mapper.AiChatMessageMapper;
import com.smartresume.ai.mapper.AiResumeScoreMapper;
import com.smartresume.ai.service.AiChatConversationCleanupService;
import com.smartresume.ai.service.AiChatMemoryArchiveService;
import com.smartresume.interview.service.InterviewPhysicalDeleteService;
import com.smartresume.resume.domain.table.ResumeEntityTableDef;
import com.smartresume.resume.domain.table.ResumeSectionEntityTableDef;
import com.smartresume.resume.domain.table.ResumeVersionEntityTableDef;
import com.smartresume.resume.mapper.ResumeMapper;
import com.smartresume.resume.mapper.ResumeSectionMapper;
import com.smartresume.resume.mapper.ResumeVersionMapper;
import com.smartresume.share.domain.ResumeShareEntity;
import com.smartresume.share.domain.table.ResumeShareEntityTableDef;
import com.smartresume.share.domain.table.ShareAccessLogEntityTableDef;
import com.smartresume.share.mapper.ResumeShareMapper;
import com.smartresume.share.mapper.ShareAccessLogMapper;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ResumePhysicalDeleteService {

    private final AiChatMessageMapper aiChatMessageMapper;
    private final AiResumeScoreMapper aiResumeScoreMapper;
    private final ResumeSectionMapper resumeSectionMapper;
    private final ResumeVersionMapper resumeVersionMapper;
    private final ResumeMapper resumeMapper;
    private final ResumeShareMapper resumeShareMapper;
    private final ShareAccessLogMapper shareAccessLogMapper;
    private final AiChatConversationCleanupService aiChatConversationCleanupService;
    private final AiChatMemoryArchiveService aiChatMemoryArchiveService;
    private final InterviewPhysicalDeleteService interviewPhysicalDeleteService;

    public ResumePhysicalDeleteService(
        AiChatMessageMapper aiChatMessageMapper,
        AiResumeScoreMapper aiResumeScoreMapper,
        ResumeSectionMapper resumeSectionMapper,
        ResumeVersionMapper resumeVersionMapper,
        ResumeMapper resumeMapper,
        ResumeShareMapper resumeShareMapper,
        ShareAccessLogMapper shareAccessLogMapper,
        AiChatConversationCleanupService aiChatConversationCleanupService,
        AiChatMemoryArchiveService aiChatMemoryArchiveService,
        InterviewPhysicalDeleteService interviewPhysicalDeleteService
    ) {
        this.aiChatMessageMapper = aiChatMessageMapper;
        this.aiResumeScoreMapper = aiResumeScoreMapper;
        this.resumeSectionMapper = resumeSectionMapper;
        this.resumeVersionMapper = resumeVersionMapper;
        this.resumeMapper = resumeMapper;
        this.resumeShareMapper = resumeShareMapper;
        this.shareAccessLogMapper = shareAccessLogMapper;
        this.aiChatConversationCleanupService = aiChatConversationCleanupService;
        this.aiChatMemoryArchiveService = aiChatMemoryArchiveService;
        this.interviewPhysicalDeleteService = interviewPhysicalDeleteService;
    }

    public void deleteResumeAndLinkedData(String resumeId, long userId) {
        deleteShares(resumeId, userId);
        deleteInterviews(resumeId, userId);
        aiChatConversationCleanupService.deleteResumeConversations(
            resumeId,
            userId,
            AiChatConversationCleanupService.REASON_RESUME_PURGE
        );
        deleteResumeFeatureMemories(resumeId, userId);
        deleteAiChatMessages(resumeId, userId);
        deleteAiResumeScores(resumeId, userId);
        deleteResumeSections(resumeId, userId);
        deleteResumeVersions(resumeId, userId);
        deleteResumeRow(resumeId, userId);
    }

    private void deleteShares(String resumeId, long userId) {
        ResumeShareEntityTableDef shareTable = ResumeShareEntityTableDef.RESUME_SHARE_ENTITY;
        QueryWrapper shareQuery = QueryWrapper.create()
            .where(shareTable.RESUME_ID.eq(resumeId))
            .and(shareTable.USER_ID.eq(userId));
        List<String> shareIds = resumeShareMapper.selectListByQuery(shareQuery).stream()
            .map(ResumeShareEntity::getId)
            .toList();
        if (!shareIds.isEmpty()) {
            ShareAccessLogEntityTableDef logTable = ShareAccessLogEntityTableDef.SHARE_ACCESS_LOG_ENTITY;
            QueryWrapper logQuery = QueryWrapper.create()
                .where(logTable.SHARE_ID.in(shareIds))
                .and(logTable.USER_ID.eq(userId));
            shareAccessLogMapper.deleteByQuery(logQuery);
        }
        resumeShareMapper.deleteByQuery(resumeOwnedQuery(shareTable.RESUME_ID, shareTable.USER_ID, resumeId, userId));
    }

    private void deleteInterviews(String resumeId, long userId) {
        interviewPhysicalDeleteService.deleteInterviewsForResume(
            resumeId,
            userId,
            AiChatConversationCleanupService.REASON_RESUME_PURGE
        );
    }

    private void deleteAiChatMessages(String resumeId, long userId) {
        AiChatMessageEntityTableDef table = AiChatMessageEntityTableDef.AI_CHAT_MESSAGE_ENTITY;
        aiChatMessageMapper.deleteByQuery(resumeOwnedQuery(table.RESUME_ID, table.USER_ID, resumeId, userId));
    }

    private void deleteAiResumeScores(String resumeId, long userId) {
        AiResumeScoreEntityTableDef table = AiResumeScoreEntityTableDef.AI_RESUME_SCORE_ENTITY;
        aiResumeScoreMapper.deleteByQuery(resumeOwnedQuery(table.RESUME_ID, table.USER_ID, resumeId, userId));
    }

    private void deleteResumeFeatureMemories(String resumeId, long userId) {
        List<String> conversationIds = aiChatMemoryArchiveService.findConversationIdsByPrefix(resumeId + "_");
        aiChatMemoryArchiveService.archiveAndDeleteAll(
            conversationIds,
            userId,
            resumeId,
            AiChatConversationCleanupService.REASON_RESUME_PURGE
        );
    }

    private void deleteResumeSections(String resumeId, long userId) {
        ResumeSectionEntityTableDef table = ResumeSectionEntityTableDef.RESUME_SECTION_ENTITY;
        resumeSectionMapper.deleteByQuery(resumeOwnedQuery(table.RESUME_ID, table.USER_ID, resumeId, userId));
    }

    private void deleteResumeVersions(String resumeId, long userId) {
        ResumeVersionEntityTableDef table = ResumeVersionEntityTableDef.RESUME_VERSION_ENTITY;
        resumeVersionMapper.deleteByQuery(resumeOwnedQuery(table.RESUME_ID, table.USER_ID, resumeId, userId));
    }

    private void deleteResumeRow(String resumeId, long userId) {
        ResumeEntityTableDef table = ResumeEntityTableDef.RESUME_ENTITY;
        resumeMapper.deleteByQuery(resumeOwnedQuery(table.ID, table.USER_ID, resumeId, userId));
    }

    private QueryWrapper resumeOwnedQuery(QueryColumn resumeColumn, QueryColumn userColumn, String resumeId, long userId) {
        return QueryWrapper.create()
            .where(resumeColumn.eq(resumeId))
            .and(userColumn.eq(userId));
    }
}
