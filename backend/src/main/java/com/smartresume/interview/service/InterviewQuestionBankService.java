package com.smartresume.interview.service;

import static com.mybatisflex.core.query.QueryMethods.lower;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mybatisflex.core.query.QueryCondition;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.interview.domain.InterviewQuestionBankEntity;
import com.smartresume.interview.domain.InterviewQuestionEntity;
import com.smartresume.interview.domain.table.InterviewQuestionBankEntityTableDef;
import com.smartresume.interview.domain.table.InterviewQuestionEntityTableDef;
import com.smartresume.interview.dto.InterviewQuestionBankDtos.QuestionBankCreateRequest;
import com.smartresume.interview.dto.InterviewQuestionBankDtos.QuestionBankResponse;
import com.smartresume.interview.dto.InterviewQuestionBankDtos.QuestionBankUpdateRequest;
import com.smartresume.interview.dto.InterviewQuestionBankDtos.QuestionCreateRequest;
import com.smartresume.interview.dto.InterviewQuestionBankDtos.QuestionResponse;
import com.smartresume.interview.dto.InterviewQuestionBankDtos.QuestionUpdateRequest;
import com.smartresume.interview.mapper.InterviewQuestionBankMapper;
import com.smartresume.interview.mapper.InterviewQuestionMapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InterviewQuestionBankService {

    private static final Logger log = LoggerFactory.getLogger(InterviewQuestionBankService.class);
    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {};

    private final InterviewQuestionBankMapper questionBankMapper;
    private final InterviewQuestionMapper questionMapper;
    private final ObjectMapper objectMapper;

    public InterviewQuestionBankService(
        InterviewQuestionBankMapper questionBankMapper,
        InterviewQuestionMapper questionMapper,
        ObjectMapper objectMapper
    ) {
        this.questionBankMapper = questionBankMapper;
        this.questionMapper = questionMapper;
        this.objectMapper = objectMapper;
    }

    public List<QuestionBankResponse> listBanks(String keyword) {
        long userId = CurrentUserContext.requireUserId();
        InterviewQuestionBankEntityTableDef bank = InterviewQuestionBankEntityTableDef.INTERVIEW_QUESTION_BANK_ENTITY;
        QueryWrapper query = QueryWrapper.create().where(bank.USER_ID.eq(userId));
        String normalizedKeyword = trimOrNull(keyword);
        if (normalizedKeyword != null) {
            String pattern = normalizedKeyword.toLowerCase(Locale.ROOT);
            QueryCondition keywordCondition = lower(bank.NAME).like(pattern)
                .or(lower(bank.DESCRIPTION).like(pattern));
            query.and(keywordCondition);
        }
        query.orderBy(bank.UPDATED_AT, false);
        return questionBankMapper.selectListByQuery(query).stream()
            .map(this::toBankResponse)
            .toList();
    }

    public QuestionBankResponse getBank(String bankId) {
        return toBankResponse(requireOwnedBank(bankId, CurrentUserContext.requireUserId()));
    }

    @Transactional
    public QuestionBankResponse createBank(QuestionBankCreateRequest request) {
        long userId = CurrentUserContext.requireUserId();
        LocalDateTime now = LocalDateTime.now();

        InterviewQuestionBankEntity entity = new InterviewQuestionBankEntity();
        entity.setId(UUID.randomUUID().toString());
        entity.setUserId(userId);
        entity.setName(requireText(request.name(), "Question bank name is required"));
        entity.setDescription(trimOrNull(request.description()));
        entity.setTagsJson(toJson(normalizeTags(request.tags(), Integer.MAX_VALUE)));
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        questionBankMapper.insert(entity);
        return toBankResponse(entity);
    }

    @Transactional
    public QuestionBankResponse updateBank(String bankId, QuestionBankUpdateRequest request) {
        long userId = CurrentUserContext.requireUserId();
        InterviewQuestionBankEntity entity = requireOwnedBank(bankId, userId);
        List<String> nextTags = normalizeTags(request.tags(), Integer.MAX_VALUE);
        ensureExistingQuestionTagsStillAllowed(bankId, userId, nextTags);

        entity.setName(requireText(request.name(), "Question bank name is required"));
        entity.setDescription(trimOrNull(request.description()));
        entity.setTagsJson(toJson(nextTags));
        entity.setUpdatedAt(LocalDateTime.now());
        questionBankMapper.update(entity);
        return toBankResponse(entity);
    }

    @Transactional
    public void deleteBank(String bankId) {
        long userId = CurrentUserContext.requireUserId();
        InterviewQuestionBankEntity entity = requireOwnedBank(bankId, userId);
        InterviewQuestionEntityTableDef question = InterviewQuestionEntityTableDef.INTERVIEW_QUESTION_ENTITY;
        questionMapper.deleteByQuery(QueryWrapper.create()
            .where(question.USER_ID.eq(userId))
            .and(question.QUESTION_BANK_ID.eq(entity.getId())));
        questionBankMapper.deleteById(entity.getId());
    }

    public List<QuestionResponse> listQuestions(String bankId) {
        long userId = CurrentUserContext.requireUserId();
        requireOwnedBank(bankId, userId);
        InterviewQuestionEntityTableDef question = InterviewQuestionEntityTableDef.INTERVIEW_QUESTION_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(question.USER_ID.eq(userId))
            .and(question.QUESTION_BANK_ID.eq(bankId))
            .orderBy(question.UPDATED_AT, false);
        return questionMapper.selectListByQuery(query).stream()
            .map(this::toQuestionResponse)
            .toList();
    }

    @Transactional
    public QuestionResponse createQuestion(String bankId, QuestionCreateRequest request) {
        long userId = CurrentUserContext.requireUserId();
        InterviewQuestionBankEntity bank = requireOwnedBank(bankId, userId);
        List<String> tags = normalizeAndValidateQuestionTags(request.tags(), readTags(bank));
        LocalDateTime now = LocalDateTime.now();

        InterviewQuestionEntity entity = new InterviewQuestionEntity();
        entity.setId(UUID.randomUUID().toString());
        entity.setUserId(userId);
        entity.setQuestionBankId(bank.getId());
        entity.setQuestion(requireText(request.question(), "Question content is required"));
        entity.setDifficulty(normalizeDifficulty(request.difficulty()));
        entity.setTagsJson(toJson(tags));
        entity.setFocusPoints(trimOrNull(request.focusPoints()));
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        questionMapper.insert(entity);
        touchBank(bank);
        return toQuestionResponse(entity);
    }

    @Transactional
    public QuestionResponse updateQuestion(String bankId, String questionId, QuestionUpdateRequest request) {
        long userId = CurrentUserContext.requireUserId();
        InterviewQuestionBankEntity bank = requireOwnedBank(bankId, userId);
        InterviewQuestionEntity entity = requireOwnedQuestion(bankId, questionId, userId);
        List<String> tags = normalizeAndValidateQuestionTags(request.tags(), readTags(bank));

        entity.setQuestion(requireText(request.question(), "Question content is required"));
        entity.setDifficulty(normalizeDifficulty(request.difficulty()));
        entity.setTagsJson(toJson(tags));
        entity.setFocusPoints(trimOrNull(request.focusPoints()));
        entity.setUpdatedAt(LocalDateTime.now());
        questionMapper.update(entity);
        touchBank(bank);
        return toQuestionResponse(entity);
    }

    @Transactional
    public void deleteQuestion(String bankId, String questionId) {
        long userId = CurrentUserContext.requireUserId();
        InterviewQuestionBankEntity bank = requireOwnedBank(bankId, userId);
        InterviewQuestionEntity entity = requireOwnedQuestion(bank.getId(), questionId, userId);
        questionMapper.deleteById(entity.getId());
        touchBank(bank);
    }

    public InterviewQuestionBankEntity requireOwnedBank(String bankId, long userId) {
        String normalized = trimOrNull(bankId);
        if (normalized == null) {
            throw new AppException(HttpStatus.NOT_FOUND, "Question bank not found");
        }
        InterviewQuestionBankEntity entity = questionBankMapper.selectOneById(normalized);
        if (entity == null || !Objects.equals(entity.getUserId(), userId)) {
            throw new AppException(HttpStatus.NOT_FOUND, "Question bank not found");
        }
        return entity;
    }

    public InterviewQuestionBankEntity loadOwnedBank(String bankId, long userId) {
        String normalized = trimOrNull(bankId);
        if (normalized == null) {
            return null;
        }
        InterviewQuestionBankEntity entity = questionBankMapper.selectOneById(normalized);
        if (entity == null || !Objects.equals(entity.getUserId(), userId)) {
            return null;
        }
        return entity;
    }

    public String findOwnedBankName(String bankId, long userId) {
        InterviewQuestionBankEntity entity = loadOwnedBank(bankId, userId);
        return entity == null ? null : entity.getName();
    }

    public List<String> normalizeAndValidateSelectedTags(String bankId, long userId, List<String> selectedTags) {
        InterviewQuestionBankEntity bank = requireOwnedBank(bankId, userId);
        List<String> normalized = normalizeTags(selectedTags, Integer.MAX_VALUE);
        validateTagsBelongToBank(normalized, readTags(bank), "Selected tags must belong to the question bank");
        return normalized;
    }

    public List<String> normalizeSelectionTags(List<String> values, InterviewQuestionBankEntity bank) {
        List<String> normalized = normalizeTags(values, Integer.MAX_VALUE);
        validateTagsBelongToBank(normalized, readTags(bank), "Selected tags must belong to the question bank");
        return normalized;
    }

    public List<String> readTags(InterviewQuestionBankEntity bank) {
        return readTagsJson(bank.getTagsJson());
    }

    public List<String> readTagsJsonBestEffort(String tagsJson) {
        return readTagsJson(tagsJson, true);
    }

    public List<String> readFocusPointsJsonBestEffort(String focusPointsJson) {
        return readTagsJson(focusPointsJson, true);
    }

    public String normalizeRelevanceOrDefault(String value) {
        String normalized = trimOrNull(value);
        if (normalized == null) {
            return InterviewConstants.QUESTION_BANK_RELEVANCE_MEDIUM;
        }
        normalized = normalized.toUpperCase(Locale.ROOT);
        if (!InterviewConstants.QUESTION_BANK_RELEVANCES.contains(normalized)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Question bank relevance is invalid");
        }
        return normalized;
    }

    private InterviewQuestionEntity requireOwnedQuestion(String bankId, String questionId, long userId) {
        InterviewQuestionEntityTableDef question = InterviewQuestionEntityTableDef.INTERVIEW_QUESTION_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(question.ID.eq(questionId))
            .and(question.USER_ID.eq(userId))
            .and(question.QUESTION_BANK_ID.eq(bankId));
        InterviewQuestionEntity entity = questionMapper.selectOneByQuery(query);
        if (entity == null) {
            throw new AppException(HttpStatus.NOT_FOUND, "Question not found");
        }
        return entity;
    }

    private void ensureExistingQuestionTagsStillAllowed(String bankId, long userId, List<String> allowedTags) {
        Set<String> allowed = new LinkedHashSet<>(allowedTags);
        InterviewQuestionEntityTableDef question = InterviewQuestionEntityTableDef.INTERVIEW_QUESTION_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(question.USER_ID.eq(userId))
            .and(question.QUESTION_BANK_ID.eq(bankId));
        for (InterviewQuestionEntity entity : questionMapper.selectListByQuery(query)) {
            if (!allowed.containsAll(readTagsJson(entity.getTagsJson()))) {
                throw new AppException(HttpStatus.CONFLICT, "Question bank tags are still used by existing questions");
            }
        }
    }

    private QuestionBankResponse toBankResponse(InterviewQuestionBankEntity entity) {
        return new QuestionBankResponse(
            entity.getId(),
            entity.getName(),
            entity.getDescription(),
            readTagsJson(entity.getTagsJson()),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private QuestionResponse toQuestionResponse(InterviewQuestionEntity entity) {
        return new QuestionResponse(
            entity.getId(),
            entity.getQuestionBankId(),
            entity.getQuestion(),
            entity.getDifficulty(),
            readTagsJson(entity.getTagsJson()),
            entity.getFocusPoints(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private void touchBank(InterviewQuestionBankEntity bank) {
        bank.setUpdatedAt(LocalDateTime.now());
        questionBankMapper.update(bank);
    }

    private List<String> normalizeAndValidateQuestionTags(List<String> tags, List<String> allowedTags) {
        List<String> normalized = normalizeTags(tags, Integer.MAX_VALUE);
        validateTagsBelongToBank(normalized, allowedTags, "Question tags must belong to the question bank");
        return normalized;
    }

    private void validateTagsBelongToBank(List<String> selectedTags, List<String> bankTags, String message) {
        Set<String> allowed = new LinkedHashSet<>(bankTags);
        if (!allowed.containsAll(selectedTags)) {
            throw new AppException(HttpStatus.BAD_REQUEST, message);
        }
    }

    private String normalizeDifficulty(String difficulty) {
        String normalized = requireText(difficulty, "Question difficulty is required").toUpperCase(Locale.ROOT);
        if (!InterviewConstants.DIFFICULTIES.contains(normalized)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Question difficulty must be EASY, MEDIUM, or HARD");
        }
        return normalized;
    }

    private List<String> normalizeTags(List<String> values, int maxItems) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        Set<String> normalized = new LinkedHashSet<>();
        for (String value : values) {
            String trimmed = trimOrNull(value);
            if (trimmed != null) {
                normalized.add(trimmed);
            }
            if (normalized.size() >= maxItems) {
                break;
            }
        }
        return new ArrayList<>(normalized);
    }

    private String toJson(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values);
        } catch (JsonProcessingException exception) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to serialize question bank payload");
        }
    }

    private List<String> readTagsJson(String tagsJson) {
        return readTagsJson(tagsJson, false);
    }

    private List<String> readTagsJson(String tagsJson, boolean bestEffort) {
        if (tagsJson == null || tagsJson.isBlank()) {
            return List.of();
        }
        try {
            return normalizeTags(objectMapper.readValue(tagsJson, STRING_LIST), Integer.MAX_VALUE);
        } catch (Exception exception) {
            if (!bestEffort) {
                throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to parse question bank tags");
            }
            log.warn("Unable to parse question bank tags: {}", exception.getMessage());
            return List.of();
        }
    }

    private String requireText(String value, String message) {
        String normalized = trimOrNull(value);
        if (normalized == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, message);
        }
        return normalized;
    }

    private String trimOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
