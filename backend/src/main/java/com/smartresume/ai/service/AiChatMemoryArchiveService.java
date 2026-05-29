package com.smartresume.ai.service;

import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.ai.domain.AiHistoryEntity;
import com.smartresume.ai.domain.SpringAiChatMemoryEntity;
import com.smartresume.ai.domain.table.SpringAiChatMemoryEntityTableDef;
import com.smartresume.ai.mapper.AiHistoryMapper;
import com.smartresume.ai.mapper.SpringAiChatMemoryMapper;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class AiChatMemoryArchiveService {

    private final SpringAiChatMemoryMapper springAiChatMemoryMapper;
    private final AiHistoryMapper aiHistoryMapper;

    public AiChatMemoryArchiveService(
        SpringAiChatMemoryMapper springAiChatMemoryMapper,
        AiHistoryMapper aiHistoryMapper
    ) {
        this.springAiChatMemoryMapper = springAiChatMemoryMapper;
        this.aiHistoryMapper = aiHistoryMapper;
    }

    public void archiveAndDelete(String conversationId, Long userId, String resumeId, String reason) {
        if (conversationId == null || conversationId.isBlank()) {
            return;
        }
        archiveAndDeleteAll(List.of(conversationId), userId, resumeId, reason);
    }

    public void archiveAndDeleteAll(Collection<String> conversationIds, Long userId, String resumeId, String reason) {
        Set<String> normalizedIds = normalizeConversationIds(conversationIds);
        if (normalizedIds.isEmpty()) {
            return;
        }

        List<SpringAiChatMemoryEntity> rows = springAiChatMemoryMapper.selectListByQuery(memorySelectQuery(normalizedIds));
        if (!rows.isEmpty()) {
            LocalDateTime archivedAt = LocalDateTime.now();
            List<AiHistoryEntity> archives = rows.stream()
                .map(row -> toArchive(row, userId, resumeId, reason, archivedAt))
                .toList();
            aiHistoryMapper.insertBatch(archives);
        }

        springAiChatMemoryMapper.deleteByQuery(memoryDeleteQuery(normalizedIds));
    }

    public List<String> findConversationIdsByPrefix(String prefix) {
        if (prefix == null || prefix.isBlank()) {
            return List.of();
        }
        SpringAiChatMemoryEntityTableDef table = SpringAiChatMemoryEntityTableDef.SPRING_AI_CHAT_MEMORY_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .select(table.CONVERSATION_ID)
            .where(table.CONVERSATION_ID.likeRaw(prefix + "%"))
            .groupBy(table.CONVERSATION_ID);
        return springAiChatMemoryMapper.selectObjectListByQueryAs(query, String.class).stream()
            .filter(conversationId -> conversationId != null && conversationId.startsWith(prefix))
            .toList();
    }

    private QueryWrapper memorySelectQuery(Collection<String> conversationIds) {
        SpringAiChatMemoryEntityTableDef table = SpringAiChatMemoryEntityTableDef.SPRING_AI_CHAT_MEMORY_ENTITY;
        return QueryWrapper.create()
            .where(table.CONVERSATION_ID.in(conversationIds))
            .orderBy(table.CONVERSATION_ID, true)
            .orderBy(table.TIMESTAMP, true);
    }

    private QueryWrapper memoryDeleteQuery(Collection<String> conversationIds) {
        SpringAiChatMemoryEntityTableDef table = SpringAiChatMemoryEntityTableDef.SPRING_AI_CHAT_MEMORY_ENTITY;
        return QueryWrapper.create().where(table.CONVERSATION_ID.in(conversationIds));
    }

    private Set<String> normalizeConversationIds(Collection<String> conversationIds) {
        if (conversationIds == null || conversationIds.isEmpty()) {
            return Set.of();
        }
        Set<String> normalized = new LinkedHashSet<>();
        for (String conversationId : conversationIds) {
            if (conversationId != null && !conversationId.isBlank()) {
                normalized.add(conversationId);
            }
        }
        return normalized;
    }

    private AiHistoryEntity toArchive(
        SpringAiChatMemoryEntity row,
        Long userId,
        String resumeId,
        String reason,
        LocalDateTime archivedAt
    ) {
        AiHistoryEntity archive = new AiHistoryEntity();
        archive.setSourceConversationId(row.getConversationId());
        archive.setUserId(userId);
        archive.setResumeId(resumeId);
        archive.setContent(row.getContent());
        archive.setType(row.getType());
        archive.setSourceTimestamp(row.getTimestamp());
        archive.setArchiveReason(reason);
        archive.setArchivedAt(archivedAt);
        return archive;
    }
}
