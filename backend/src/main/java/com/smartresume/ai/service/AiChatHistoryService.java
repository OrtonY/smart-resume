package com.smartresume.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.ai.domain.AiChatConversationEntity;
import com.smartresume.ai.domain.AiChatSuggestionEntity;
import com.smartresume.ai.domain.table.AiChatConversationEntityTableDef;
import com.smartresume.ai.domain.table.AiChatSuggestionEntityTableDef;
import com.smartresume.ai.dto.AiDtos.AiChatConversation;
import com.smartresume.ai.dto.AiDtos.AiChatMessage;
import com.smartresume.ai.dto.suggestion.AiResumeSuggestion;
import com.smartresume.ai.dto.suggestion.AiResumeSuggestionPlan;
import com.smartresume.ai.mapper.AiChatConversationMapper;
import com.smartresume.ai.mapper.AiChatSuggestionMapper;
import com.smartresume.ai.memory.AiConversationIdGenerator;
import com.smartresume.ai.memory.AiFeatureType;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.resume.service.ResumeService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.ai.chat.memory.repository.jdbc.JdbcChatMemoryRepository;
import org.springframework.ai.chat.messages.Message;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiChatHistoryService {

    private static final int MAX_TITLE_LENGTH = 60;
    private static final int MAX_RESUME_CHAT_CONVERSATIONS = 10;
    private static final String EMPTY_SUGGESTIONS_JSON = "{\"suggestions\":[]}";
    private static final String STATUS_PENDING = "pending";
    private static final Set<String> ALLOWED_SUGGESTION_STATUSES = Set.of(
        STATUS_PENDING,
        "applied",
        "dismissed"
    );

    private final JdbcChatMemoryRepository chatMemoryRepository;
    private final AiChatConversationMapper aiChatConversationMapper;
    private final AiChatSuggestionMapper aiChatSuggestionMapper;
    private final AiChatConversationCleanupService aiChatConversationCleanupService;
    private final ResumeService resumeService;
    private final ObjectMapper objectMapper;

    public AiChatHistoryService(
        JdbcChatMemoryRepository chatMemoryRepository,
        AiChatConversationMapper aiChatConversationMapper,
        AiChatSuggestionMapper aiChatSuggestionMapper,
        AiChatConversationCleanupService aiChatConversationCleanupService,
        ResumeService resumeService,
        ObjectMapper objectMapper
    ) {
        this.chatMemoryRepository = chatMemoryRepository;
        this.aiChatConversationMapper = aiChatConversationMapper;
        this.aiChatSuggestionMapper = aiChatSuggestionMapper;
        this.aiChatConversationCleanupService = aiChatConversationCleanupService;
        this.resumeService = resumeService;
        this.objectMapper = objectMapper;
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
        Map<Integer, List<AiResumeSuggestion>> suggestionsByAssistantIndex = loadSuggestionsByAssistantIndex(conversation);

        List<AiChatMessage> history = new ArrayList<>();
        int assistantMessageIndex = -1;
        for (Message message : chatMemoryRepository.findByConversationId(conversation.getConversationId())) {
            List<AiResumeSuggestion> suggestions = null;
            if (isAssistantMessage(message)) {
                assistantMessageIndex += 1;
                suggestions = suggestionsByAssistantIndex.get(assistantMessageIndex);
            }
            history.add(toChatMessage(message, suggestions));
        }
        return history;
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
        enforceConversationLimit(resumeId, userId);
        return conversation.getConversationId();
    }

    @Transactional
    public void deleteConversation(String resumeId, String conversationId) {
        resumeService.validResume(resumeId);
        AiChatConversationEntity conversation = requireConversation(resumeId, conversationId);
        aiChatConversationCleanupService.deleteConversation(
            conversation,
            AiChatConversationCleanupService.REASON_MANUAL_DELETE
        );
    }

    @Transactional
    public String persistSuggestionPlan(String resumeId, String conversationId, String suggestionJson) {
        return persistSuggestionPlan(resumeId, conversationId, suggestionJson, CurrentUserContext.requireUserId());
    }

    @Transactional
    public String persistSuggestionPlan(String resumeId, String conversationId, String suggestionJson, long userId) {
        AiChatConversationEntity conversation = requireConversation(resumeId, conversationId, userId);
        AiResumeSuggestionPlan plan = parseSuggestionPlan(suggestionJson);
        if (plan.suggestions().isEmpty()) {
            return EMPTY_SUGGESTIONS_JSON;
        }

        int assistantMessageIndex = resolveLatestAssistantMessageIndex(conversationId);

        LocalDateTime now = LocalDateTime.now();
        List<AiResumeSuggestion> normalizedSuggestions = new ArrayList<>();
        for (AiResumeSuggestion suggestion : plan.suggestions()) {
            if (!isPersistableSuggestion(suggestion)) {
                continue;
            }

            int displayOrder = normalizedSuggestions.size();
            String suggestionId = buildSuggestionId(conversationId, assistantMessageIndex, displayOrder);
            AiChatSuggestionEntity existingSuggestion = findSuggestion(conversation, suggestionId);
            if (existingSuggestion != null) {
                normalizedSuggestions.add(toSuggestion(existingSuggestion));
                continue;
            }

            AiChatSuggestionEntity entity = new AiChatSuggestionEntity();
            entity.setUserId(conversation.getUserId());
            entity.setResumeId(conversation.getResumeId());
            entity.setConversationId(conversation.getConversationId());
            entity.setAssistantMessageIndex(assistantMessageIndex);
            entity.setDisplayOrder(displayOrder);
            entity.setSuggestionId(suggestionId);
            entity.setSection(suggestion.section().name());
            entity.setSectionIndex(suggestion.index());
            entity.setField(suggestion.field());
            entity.setCurrentValue(suggestion.currentValue());
            entity.setSuggestedValue(suggestion.suggestedValue());
            entity.setRationale(suggestion.rationale());
            entity.setStatus(STATUS_PENDING);
            entity.setCreatedAt(now);
            entity.setUpdatedAt(now);
            aiChatSuggestionMapper.insert(entity);

            normalizedSuggestions.add(new AiResumeSuggestion(
                suggestionId,
                suggestion.section(),
                suggestion.index(),
                suggestion.field(),
                suggestion.currentValue(),
                suggestion.suggestedValue(),
                suggestion.rationale(),
                STATUS_PENDING
            ));
        }

        if (normalizedSuggestions.isEmpty()) {
            return EMPTY_SUGGESTIONS_JSON;
        }
        return writeSuggestionPlan(new AiResumeSuggestionPlan(normalizedSuggestions, plan.summary()));
    }

    @Transactional
    public void updateSuggestionStatus(String resumeId, String conversationId, String suggestionId, String status) {
        String normalizedStatus = normalizeSuggestionStatus(status);
        AiChatConversationEntity conversation = requireConversation(resumeId, conversationId);
        AiChatSuggestionEntity entity = requireSuggestion(conversation, suggestionId);
        entity.setStatus(normalizedStatus);
        entity.setUpdatedAt(LocalDateTime.now());
        aiChatSuggestionMapper.update(entity);
    }

    private AiChatMessage toChatMessage(Message message, List<AiResumeSuggestion> suggestions) {
        return new AiChatMessage(
            message.getMessageType().name().toLowerCase(),
            message.getText(),
            suggestions == null || suggestions.isEmpty() ? null : suggestions
        );
    }

    private AiResumeSuggestion toSuggestion(AiChatSuggestionEntity entity) {
        return new AiResumeSuggestion(
            entity.getSuggestionId(),
            com.smartresume.ai.dto.suggestion.ResumeSection.valueOf(entity.getSection()),
            entity.getSectionIndex(),
            entity.getField(),
            entity.getCurrentValue(),
            entity.getSuggestedValue(),
            entity.getRationale(),
            entity.getStatus()
        );
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
        return requireConversation(resumeId, conversationId, CurrentUserContext.requireUserId());
    }

    private AiChatConversationEntity requireConversation(String resumeId, String conversationId, long userId) {
        if (conversationId == null || conversationId.isBlank()) {
            throw AppException.of(HttpStatus.BAD_REQUEST, "error.aiChat.conversationIdRequired");
        }
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

    private void enforceConversationLimit(String resumeId, long userId) {
        AiChatConversationEntityTableDef table = AiChatConversationEntityTableDef.AI_CHAT_CONVERSATION_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(table.RESUME_ID.eq(resumeId))
            .and(table.USER_ID.eq(userId))
            .orderBy(table.UPDATED_AT, true)
            .orderBy(table.CREATED_AT, true);
        List<AiChatConversationEntity> conversations = aiChatConversationMapper.selectListByQuery(query);
        int overflowCount = conversations.size() - MAX_RESUME_CHAT_CONVERSATIONS;
        if (overflowCount <= 0) {
            return;
        }
        conversations.stream()
            .limit(overflowCount)
            .forEach(conversation -> aiChatConversationCleanupService.deleteConversation(
                conversation,
                AiChatConversationCleanupService.REASON_RETENTION_LIMIT
            ));
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

    private Map<Integer, List<AiResumeSuggestion>> loadSuggestionsByAssistantIndex(AiChatConversationEntity conversation) {
        AiChatSuggestionEntityTableDef table = AiChatSuggestionEntityTableDef.AI_CHAT_SUGGESTION_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(table.USER_ID.eq(conversation.getUserId()))
            .and(table.RESUME_ID.eq(conversation.getResumeId()))
            .and(table.CONVERSATION_ID.eq(conversation.getConversationId()))
            .orderBy(table.ASSISTANT_MESSAGE_INDEX, true)
            .orderBy(table.DISPLAY_ORDER, true);

        Map<Integer, List<AiResumeSuggestion>> grouped = new LinkedHashMap<>();
        for (AiChatSuggestionEntity entity : aiChatSuggestionMapper.selectListByQuery(query)) {
            grouped.computeIfAbsent(entity.getAssistantMessageIndex(), ignored -> new ArrayList<>())
                .add(toSuggestion(entity));
        }
        return grouped;
    }

    private int resolveLatestAssistantMessageIndex(String conversationId) {
        long assistantCount = chatMemoryRepository.findByConversationId(conversationId).stream()
            .filter(this::isAssistantMessage)
            .count();
        return Math.max((int) assistantCount - 1, 0);
    }

    private boolean isAssistantMessage(Message message) {
        return "ASSISTANT".equals(message.getMessageType().name());
    }

    private AiChatSuggestionEntity requireSuggestion(AiChatConversationEntity conversation, String suggestionId) {
        AiChatSuggestionEntity entity = findSuggestion(conversation, suggestionId);
        if (entity == null) {
            throw AppException.of(HttpStatus.NOT_FOUND, "error.aiChat.suggestionNotFound");
        }
        return entity;
    }

    private AiChatSuggestionEntity findSuggestion(AiChatConversationEntity conversation, String suggestionId) {
        AiChatSuggestionEntityTableDef table = AiChatSuggestionEntityTableDef.AI_CHAT_SUGGESTION_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(table.USER_ID.eq(conversation.getUserId()))
            .and(table.RESUME_ID.eq(conversation.getResumeId()))
            .and(table.CONVERSATION_ID.eq(conversation.getConversationId()))
            .and(table.SUGGESTION_ID.eq(suggestionId));
        return aiChatSuggestionMapper.selectOneByQuery(query);
    }

    private AiResumeSuggestionPlan parseSuggestionPlan(String suggestionJson) {
        if (suggestionJson == null || suggestionJson.isBlank()) {
            return new AiResumeSuggestionPlan(List.of(), null);
        }
        try {
            AiResumeSuggestionPlan plan = objectMapper.readValue(suggestionJson, AiResumeSuggestionPlan.class);
            if (plan.suggestions() == null) {
                return new AiResumeSuggestionPlan(List.of(), plan.summary());
            }
            return plan;
        } catch (JsonProcessingException exception) {
            throw AppException.of(HttpStatus.INTERNAL_SERVER_ERROR, "error.ai.parseFailed", "suggestion plan");
        }
    }

    private String writeSuggestionPlan(AiResumeSuggestionPlan plan) {
        try {
            return objectMapper.writeValueAsString(plan);
        } catch (JsonProcessingException exception) {
            throw AppException.of(HttpStatus.INTERNAL_SERVER_ERROR, "error.ai.parseFailed", "normalized suggestion plan");
        }
    }

    private boolean isPersistableSuggestion(AiResumeSuggestion suggestion) {
        return suggestion != null
            && suggestion.section() != null
            && suggestion.field() != null
            && !suggestion.field().isBlank()
            && suggestion.suggestedValue() != null
            && !suggestion.suggestedValue().isBlank()
            && suggestion.rationale() != null
            && !suggestion.rationale().isBlank();
    }

    private String normalizeSuggestionStatus(String status) {
        if (status == null || status.isBlank()) {
            throw AppException.of(HttpStatus.BAD_REQUEST, "error.aiChat.suggestionStatusInvalid");
        }
        String normalized = status.trim().toLowerCase();
        if (!ALLOWED_SUGGESTION_STATUSES.contains(normalized)) {
            throw AppException.of(HttpStatus.BAD_REQUEST, "error.aiChat.suggestionStatusInvalid");
        }
        return normalized;
    }

    private String buildSuggestionId(String conversationId, int assistantMessageIndex, int displayOrder) {
        return conversationId + "-a" + assistantMessageIndex + "-s" + displayOrder;
    }
}
