package com.smartresume.ai.service;

import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.ai.domain.AiChatConversationEntity;
import com.smartresume.ai.dto.AiDtos.AiChatConversation;
import com.smartresume.ai.dto.AiDtos.AiChatMessage;
import com.smartresume.ai.mapper.AiChatConversationMapper;
import com.smartresume.ai.memory.AiConversationIdGenerator;
import com.smartresume.ai.memory.AiFeatureType;
import com.smartresume.common.exception.AppException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
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

    public AiChatHistoryService(
        JdbcChatMemoryRepository chatMemoryRepository,
        AiChatConversationMapper aiChatConversationMapper
    ) {
        this.chatMemoryRepository = chatMemoryRepository;
        this.aiChatConversationMapper = aiChatConversationMapper;
    }

    public List<AiChatConversation> listConversations(String resumeId) {
        QueryWrapper query = QueryWrapper.create()
            .where("resume_id = ?", resumeId)
            .orderBy("updated_at", false);
        return aiChatConversationMapper.selectListByQuery(query).stream()
            .map(this::toConversation)
            .toList();
    }

    public List<AiChatMessage> listHistory(String resumeId, String conversationId) {
        AiChatConversationEntity conversation = requireConversation(resumeId, conversationId);
        return chatMemoryRepository.findByConversationId(conversation.getConversationId()).stream()
            .map(this::toChatMessage)
            .toList();
    }

    @Transactional
    public String resolveConversationId(String resumeId, String requestedConversationId, String firstMessage) {
        if (requestedConversationId != null && !requestedConversationId.isBlank()) {
            AiChatConversationEntity conversation = requireConversation(resumeId, requestedConversationId);
            touch(conversation);
            return conversation.getConversationId();
        }

        LocalDateTime now = LocalDateTime.now();
        AiChatConversationEntity conversation = new AiChatConversationEntity();
        conversation.setConversationId(AiConversationIdGenerator.generate(resumeId, AiFeatureType.RESUME_CHAT));
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
            throw new AppException(HttpStatus.BAD_REQUEST, "Conversation id is required");
        }
        AiChatConversationEntity conversation = aiChatConversationMapper.selectOneById(conversationId);
        if (conversation == null || !resumeId.equals(conversation.getResumeId())) {
            throw new AppException(HttpStatus.NOT_FOUND, "AI chat conversation not found");
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
