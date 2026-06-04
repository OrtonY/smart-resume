package com.smartresume.interview.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartresume.interview.domain.InterviewQuestionBankEntity;
import com.smartresume.interview.domain.InterviewQuestionEntity;
import com.smartresume.interview.domain.InterviewSessionEntity;
import com.smartresume.interview.mapper.InterviewQuestionMapper;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class InterviewQuestionBankSamplingService {

    private static final Logger log = LoggerFactory.getLogger(InterviewQuestionBankSamplingService.class);

    private final InterviewQuestionBankService questionBankService;
    private final InterviewQuestionMapper questionMapper;
    private final ObjectMapper objectMapper;
    private final ConcurrentMap<String, Set<String>> usedQuestionIdsBySession = new ConcurrentHashMap<>();

    public InterviewQuestionBankSamplingService(
        InterviewQuestionBankService questionBankService,
        InterviewQuestionMapper questionMapper,
        ObjectMapper objectMapper
    ) {
        this.questionBankService = questionBankService;
        this.questionMapper = questionMapper;
        this.objectMapper = objectMapper;
    }

    public QuestionBankPromptContext sampleForPrompt(InterviewSessionEntity session) {
        if (session == null || session.getQuestionBankId() == null || session.getQuestionBankId().isBlank()) {
            return QuestionBankPromptContext.empty();
        }

        InterviewQuestionBankEntity bank = questionBankService.loadOwnedBank(session.getQuestionBankId(), session.getUserId());
        if (bank == null) {
            return QuestionBankPromptContext.empty();
        }

        String relevance = normalizeRelevance(session.getQuestionBankRelevance());
        int limit = limitForRelevance(relevance);
        List<String> selectedTags = readSelectionTagsBestEffort(session);
        Set<String> usedIds = usedQuestionIdsBySession.computeIfAbsent(session.getId(), ignored -> ConcurrentHashMap.newKeySet());

        List<InterviewQuestionEntity> sampled;
        try {
            sampled = questionMapper.selectRandomForPrompt(
                session.getUserId(),
                bank.getId(),
                selectedTags,
                new ArrayList<>(usedIds),
                limit
            );
        } catch (Exception exception) {
            log.warn(
                "Question bank sampling failed for session {} bank {}: {}",
                session.getId(),
                bank.getId(),
                exception.getMessage()
            );
            return QuestionBankPromptContext.empty();
        }

        if (sampled == null || sampled.isEmpty()) {
            return QuestionBankPromptContext.empty();
        }
        usedIds.addAll(sampled.stream().map(InterviewQuestionEntity::getId).toList());

        List<InterviewPromptBuilder.QuestionBankPromptItem> items = sampled.stream()
            .map(question -> new InterviewPromptBuilder.QuestionBankPromptItem(
                question.getQuestion(),
                splitFocusPoints(question.getFocusPoints())
            ))
            .toList();
        return new QuestionBankPromptContext(relevance, items);
    }

    public void clearSession(String sessionId) {
        if (sessionId != null) {
            usedQuestionIdsBySession.remove(sessionId);
        }
    }

    private List<String> readSelectionTagsBestEffort(InterviewSessionEntity session) {
        return readStringListBestEffort(session.getQuestionBankTagsJson());
    }

    private List<String> readStringListBestEffort(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<String> values = objectMapper.readValue(json, new TypeReference<List<String>>() {});
            return normalizeDistinctValues(values);
        } catch (Exception exception) {
            log.warn("Unable to parse question bank JSON selection: {}", exception.getMessage());
            return List.of();
        }
    }

    private List<String> splitFocusPoints(String focusPoints) {
        if (focusPoints == null || focusPoints.isBlank()) {
            return List.of();
        }
        return normalizeDistinctValues(List.of(focusPoints.split("\\R")));
    }

    private List<String> normalizeDistinctValues(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String value : values) {
            if (value == null || value.isBlank()) {
                continue;
            }
            normalized.add(value.trim());
        }
        return new ArrayList<>(normalized);
    }

    private String normalizeRelevance(String relevance) {
        if (relevance == null || relevance.isBlank()) {
            return InterviewConstants.QUESTION_BANK_RELEVANCE_MEDIUM;
        }
        String normalized = relevance.trim().toUpperCase(Locale.ROOT);
        if (!InterviewConstants.QUESTION_BANK_RELEVANCES.contains(normalized)) {
            return InterviewConstants.QUESTION_BANK_RELEVANCE_MEDIUM;
        }
        return normalized;
    }

    private int limitForRelevance(String relevance) {
        return switch (relevance) {
            case InterviewConstants.QUESTION_BANK_RELEVANCE_LOW -> InterviewConstants.QUESTION_BANK_LOW_LIMIT;
            case InterviewConstants.QUESTION_BANK_RELEVANCE_HIGH -> InterviewConstants.QUESTION_BANK_HIGH_LIMIT;
            default -> InterviewConstants.QUESTION_BANK_MEDIUM_LIMIT;
        };
    }

    public record QuestionBankPromptContext(
        String relevance,
        List<InterviewPromptBuilder.QuestionBankPromptItem> questions
    ) {
        public static QuestionBankPromptContext empty() {
            return new QuestionBankPromptContext(null, List.of());
        }

        public boolean isEmpty() {
            return questions == null || questions.isEmpty();
        }
    }
}
