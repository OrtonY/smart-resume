package com.smartresume.ai.service;

import com.smartresume.ai.domain.AiChatConversationEntity;
import com.smartresume.ai.domain.table.AiChatConversationEntityTableDef;
import com.smartresume.ai.dto.AiDtos.AiChatConversation;
import com.smartresume.ai.dto.AiDtos.AiChatMessage;
import com.smartresume.ai.mapper.AiChatConversationMapper;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.ai.memory.AiConversationIdGenerator;
import com.smartresume.ai.memory.AiFeatureType;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.resume.service.ResumeService;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.ai.chat.memory.repository.jdbc.JdbcChatMemoryRepository;
import org.springframework.ai.chat.messages.Message;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiChatHistoryService {

    private static final int MAX_TITLE_LENGTH = 60;

    private final JdbcChatMemoryRepository chatMemoryRepository;
    private final AiChatConversationMapper aiChatConversationMapper;
    private final ResumeService resumeService;

    public AiChatHistoryService(
        JdbcChatMemoryRepository chatMemoryRepository,
        AiChatConversationMapper aiChatConversationMapper,
        ResumeService resumeService
    ) {
        this.chatMemoryRepository = chatMemoryRepository;
        this.aiChatConversationMapper = aiChatConversationMapper;
        this.resumeService = resumeService;
    }

    public List<AiChatConversation> listConversations(String resumeId) {
        long userId = CurrentUserContext.requireUserId();
        resumeService.validResume(resumeId);
        AiChatConversationEntityTableDef table = AiChatConversationEntityTableDef.AI_CHAT_CONVERSATION_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(table.RESUME_ID.eq(resumeId))
            .and(table.USER_ID.eq(userId))
            .orderBy(table.UPDATED_AT, false);
        return aiChatConversationMapper.selectListByQuery(query).stream()
            .map(this::toConversation)
            .toList();
    }

    public List<AiChatMessage> listHistory(String resumeId, String conversationId) {
        resumeService.validResume(resumeId);
        AiChatConversationEntity conversation = requireConversation(resumeId, conversationId);
        return chatMemoryRepository.findByConversationId(conversation.getConversationId()).stream()
            .map(this::toChatMessage)
            .toList();
    }

    @Transactional
    public String resolveConversationId(String resumeId, String requestedConversationId, String firstMessage) {
        long userId = CurrentUserContext.requireUserId();
        resumeService.validResume(resumeId);
        if (requestedConversationId != null && !requestedConversationId.isBlank()) {
            AiChatConversationEntity conversation = requireConversation(resumeId, requestedConversationId);
            touch(conversation);
            return conversation.getConversationId();
        }

        LocalDateTime now = LocalDateTime.now();
        AiChatConversationEntity conversation = new AiChatConversationEntity();
        conversation.setConversationId(AiConversationIdGenerator.generate(resumeId, AiFeatureType.RESUME_CHAT));
        conversation.setUserId(userId);
        conversation.setResumeId(resumeId);
        conversation.setTitle(toTitle(firstMessage));
        conversation.setCreatedAt(now);
        conversation.setUpdatedAt(now);
        aiChatConversationMapper.insert(conversation);
        return conversation.getConversationId();
    }

    private AiChatMessage toChatMessage(Message message) {
        return new AiChatMessage(message.getMessageType().name().toLowerCase(), message.getText());
    }

    private AiChatConversation toConversation(AiChatConversationEntity entity) {
        return new AiChatConversation(
            entity.getConversationId(),
            entity.getTitle(),
            entity.getCreatedAt().toString(),
            entity.getUpdatedAt().toString()
        );
    }

    private AiChatConversationEntity requireConversation(String resumeId, String conversationId) {
        if (conversationId == null || conversationId.isBlank()) {
            throw AppException.of(HttpStatus.BAD_REQUEST, "error.aiChat.conversationIdRequired");
        }
        long userId = CurrentUserContext.requireUserId();
        AiChatConversationEntityTableDef table = AiChatConversationEntityTableDef.AI_CHAT_CONVERSATION_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(table.CONVERSATION_ID.eq(conversationId))
            .and(table.RESUME_ID.eq(resumeId))
            .and(table.USER_ID.eq(userId));
        AiChatConversationEntity conversation = aiChatConversationMapper.selectOneByQuery(query);
        if (conversation == null) {
            throw AppException.of(HttpStatus.NOT_FOUND, "error.aiChat.conversationNotFound");
        }
        return conversation;
    }

    private void touch(AiChatConversationEntity conversation) {
        conversation.setUpdatedAt(LocalDateTime.now());
        aiChatConversationMapper.update(conversation);
    }

    private String toTitle(String firstMessage) {
        String title = firstMessage == null ? "New chat" : firstMessage.trim().replaceAll("\\s+", " ");
        if (title.isBlank()) {
            return "New chat";
        }
        if (title.length() <= MAX_TITLE_LENGTH) {
            return title;
        }
        return title.substring(0, MAX_TITLE_LENGTH);
    }
}
