package com.smartresume.ai.service;

import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.ai.domain.AiChatConversationEntity;
import com.smartresume.ai.domain.AiChatSuggestionEntity;
import com.smartresume.ai.domain.table.AiChatConversationEntityTableDef;
import com.smartresume.ai.domain.table.AiChatSuggestionEntityTableDef;
import com.smartresume.ai.mapper.AiChatConversationMapper;
import com.smartresume.ai.mapper.AiChatSuggestionMapper;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AiChatConversationCleanupService {

    public static final String REASON_MANUAL_DELETE = "MANUAL_DELETE";
    public static final String REASON_RETENTION_LIMIT = "RETENTION_LIMIT";
    public static final String REASON_RESUME_PURGE = "RESUME_PURGE";

    private final AiChatConversationMapper aiChatConversationMapper;
    private final AiChatSuggestionMapper aiChatSuggestionMapper;
    private final AiChatMemoryArchiveService aiChatMemoryArchiveService;

    public AiChatConversationCleanupService(
        AiChatConversationMapper aiChatConversationMapper,
        AiChatSuggestionMapper aiChatSuggestionMapper,
        AiChatMemoryArchiveService aiChatMemoryArchiveService
    ) {
        this.aiChatConversationMapper = aiChatConversationMapper;
        this.aiChatSuggestionMapper = aiChatSuggestionMapper;
        this.aiChatMemoryArchiveService = aiChatMemoryArchiveService;
    }

    public void deleteConversation(AiChatConversationEntity conversation, String reason) {
        if (conversation == null) {
            return;
        }
        deleteSuggestionsForConversation(conversation.getUserId(), conversation.getResumeId(), conversation.getConversationId());
        aiChatMemoryArchiveService.archiveAndDelete(
            conversation.getConversationId(),
            conversation.getUserId(),
            conversation.getResumeId(),
            reason
        );
        aiChatConversationMapper.deleteById(conversation.getConversationId());
    }

    public void deleteResumeConversations(String resumeId, long userId, String reason) {
        QueryWrapper query = resumeConversationQuery(resumeId, userId);
        List<AiChatConversationEntity> conversations = aiChatConversationMapper.selectListByQuery(query);
        if (conversations.isEmpty()) {
            return;
        }
        List<String> conversationIds = conversations.stream()
            .map(AiChatConversationEntity::getConversationId)
            .toList();
        deleteSuggestionsForConversations(userId, resumeId, conversationIds);
        aiChatMemoryArchiveService.archiveAndDeleteAll(conversationIds, userId, resumeId, reason);
        aiChatConversationMapper.deleteByQuery(resumeConversationQuery(resumeId, userId));
    }

    private QueryWrapper resumeConversationQuery(String resumeId, long userId) {
        AiChatConversationEntityTableDef table = AiChatConversationEntityTableDef.AI_CHAT_CONVERSATION_ENTITY;
        return QueryWrapper.create()
            .where(table.RESUME_ID.eq(resumeId))
            .and(table.USER_ID.eq(userId));
    }

    private void deleteSuggestionsForConversation(Long userId, String resumeId, String conversationId) {
        AiChatSuggestionEntityTableDef table = AiChatSuggestionEntityTableDef.AI_CHAT_SUGGESTION_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(table.USER_ID.eq(userId))
            .and(table.RESUME_ID.eq(resumeId))
            .and(table.CONVERSATION_ID.eq(conversationId));
        aiChatSuggestionMapper.deleteByQuery(query);
    }

    private void deleteSuggestionsForConversations(Long userId, String resumeId, List<String> conversationIds) {
        if (conversationIds.isEmpty()) {
            return;
        }
        AiChatSuggestionEntityTableDef table = AiChatSuggestionEntityTableDef.AI_CHAT_SUGGESTION_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(table.USER_ID.eq(userId))
            .and(table.RESUME_ID.eq(resumeId))
            .and(table.CONVERSATION_ID.in(conversationIds));
        aiChatSuggestionMapper.deleteByQuery(query);
    }
}
