package com.smartresume.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartresume.ai.dto.AiDtos.AiResumeContext;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreRequest;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreResponse;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.ai.memory.AiConversationIdGenerator;
import com.smartresume.ai.memory.AiFeatureType;
import com.smartresume.common.exception.AppException;
import com.smartresume.resume.service.ResumeService;
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
    private final ObjectMapper objectMapper;

    public AiResumeScoringService(
        AiChatService aiChatService,
        ResumeService resumeService,
        ObjectMapper objectMapper
    ) {
        this.aiChatService = aiChatService;
        this.resumeService = resumeService;
        this.objectMapper = objectMapper;
    }

    public AiResumeScoreResponse scoreResume(AiResumeScoreRequest request) {
        AiResumeContext resume = request.resume();
        resumeService.validResume(resume.id());
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
        return response;
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
}
