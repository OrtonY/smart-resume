package com.smartresume.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.ai.domain.AiResumeScoreEntity;
import com.smartresume.ai.domain.table.AiResumeScoreEntityTableDef;
import com.smartresume.ai.dto.AiDtos.AiResumeContext;
import com.smartresume.ai.dto.AiDtos.PersistedAiResumeScoreResponse;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreRequest;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreResponse;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.ai.mapper.AiResumeScoreMapper;
import com.smartresume.ai.memory.AiConversationIdGenerator;
import com.smartresume.ai.memory.AiFeatureType;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.resume.service.ResumeService;
import java.io.IOException;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class AiResumeScoringService {

    private static final Logger log = LoggerFactory.getLogger(AiResumeScoringService.class);

    private static final String SCORING_SYSTEM_PROMPT = """
        You are a professional resume scoring assistant.
        Analyze the provided resume and give a detailed score with actionable suggestions.

        Scoring rules:
        - Score range: 35-96 (integer)
        - Evaluate completeness, expression quality, and JD match (if provided)
        - Provide 2-4 strengths
        - Provide 2-4 suggestion groups, each with 2-4 suggestions
        - Summary should be 1-2 sentences

        Output MUST be valid JSON matching the required schema.
        Default to Chinese for all text content.
        """;

    private final AiChatService aiChatService;
    private final ResumeService resumeService;
    private final AiResumeScoreMapper aiResumeScoreMapper;
    private final ObjectMapper objectMapper;

    public AiResumeScoringService(
        AiChatService aiChatService,
        ResumeService resumeService,
        AiResumeScoreMapper aiResumeScoreMapper,
        ObjectMapper objectMapper
    ) {
        this.aiChatService = aiChatService;
        this.resumeService = resumeService;
        this.aiResumeScoreMapper = aiResumeScoreMapper;
        this.objectMapper = objectMapper;
    }

    public AiResumeScoreResponse scoreResume(AiResumeScoreRequest request) {
        AiResumeContext resume = request.resume();
        resumeService.validResume(resume.id());
        long userId = CurrentUserContext.requireUserId();
        boolean jobDescriptionProvided = StringUtils.hasText(request.jobDescription());

        String conversationId = AiConversationIdGenerator.generate(resume.id(), AiFeatureType.RESUME_SCORE);
        String userMessage = buildScoringUserMessage(resume, request.jobDescription(), jobDescriptionProvided);

        AiInvocationRequest invocationRequest = new AiInvocationRequest(
            SCORING_SYSTEM_PROMPT,
            userMessage,
            conversationId
        );

        log.info("Scoring resume {} with AI (conversationId={})", resume.id(), conversationId);

        AiResumeScoreResponse aiResponse = aiChatService.callStructured(invocationRequest, AiResumeScoreResponse.class);

        // Force mode to "ai" and ensure generatedAt is set
        AiResumeScoreResponse response = new AiResumeScoreResponse(
            aiResponse.score(),
            aiResponse.summary(),
            aiResponse.strengths(),
            aiResponse.suggestionGroups(),
            jobDescriptionProvided,
            aiResponse.generatedAt() != null ? aiResponse.generatedAt() : java.time.Instant.now().toString(),
            "ai"
        );

        log.info("Resume {} scored: {} (mode={})", resume.id(), response.score(), response.mode());
        persistScore(resume.id(), userId, request.jobDescription(), response);
        return response;
    }

    public PersistedAiResumeScoreResponse getPersistedScore(String resumeId) {
        resumeService.validResume(resumeId);
        long userId = CurrentUserContext.requireUserId();
        AiResumeScoreEntity entity = findPersistedScore(resumeId, userId);
        if (entity == null) {
            return null;
        }
        return new PersistedAiResumeScoreResponse(
            entity.getJobDescription(),
            fromJson(entity.getResultJson(), AiResumeScoreResponse.class)
        );
    }

    private String buildScoringUserMessage(AiResumeContext resume, String jobDescription, boolean jobDescriptionProvided) {
        StringBuilder sb = new StringBuilder();
        sb.append("Please score the following resume:\n\n");
        sb.append("Resume JSON:\n");
        try {
            sb.append(objectMapper.writeValueAsString(resume));
        } catch (JsonProcessingException e) {
            throw AppException.of(HttpStatus.INTERNAL_SERVER_ERROR, "error.ai.resumeSerializeFailed");
        }

        if (jobDescriptionProvided) {
            sb.append("\n\nTarget Job Description:\n").append(jobDescription);
        }

        return sb.toString();
    }

    private void persistScore(String resumeId, long userId, String jobDescription, AiResumeScoreResponse response) {
        LocalDateTime now = LocalDateTime.now();
        AiResumeScoreEntity entity = findPersistedScore(resumeId, userId);
        boolean existing = entity != null;
        if (entity == null) {
            entity = new AiResumeScoreEntity();
            entity.setResumeId(resumeId);
            entity.setUserId(userId);
            entity.setCreatedAt(now);
        }
        entity.setJobDescription(jobDescription == null ? "" : jobDescription.trim());
        entity.setResultJson(toJson(response));
        entity.setUpdatedAt(now);
        if (entity.getCreatedAt() == null) {
            entity.setCreatedAt(now);
        }
        if (!existing) {
            aiResumeScoreMapper.insert(entity);
            return;
        }
        aiResumeScoreMapper.update(entity);
    }

    private AiResumeScoreEntity findPersistedScore(String resumeId, long userId) {
        AiResumeScoreEntityTableDef table = AiResumeScoreEntityTableDef.AI_RESUME_SCORE_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(table.RESUME_ID.eq(resumeId))
            .and(table.USER_ID.eq(userId));
        return aiResumeScoreMapper.selectOneByQuery(query);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw AppException.of(HttpStatus.INTERNAL_SERVER_ERROR, "error.ai.resumeScoreSerializeFailed");
        }
    }

    private <T> T fromJson(String value, Class<T> type) {
        try {
            return objectMapper.readValue(value, type);
        } catch (IOException e) {
            throw AppException.of(HttpStatus.INTERNAL_SERVER_ERROR, "error.ai.resumeScoreParseFailed");
        }
    }
}
