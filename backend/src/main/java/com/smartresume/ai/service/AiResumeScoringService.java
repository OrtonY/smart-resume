package com.smartresume.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartresume.ai.dto.AiDtos.AiBulletRewriteRequest;
import com.smartresume.ai.dto.AiDtos.AiBulletRewriteResponse;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.ai.domain.AiResumeScoreEntity;
import com.smartresume.ai.domain.table.AiResumeScoreEntityTableDef;
import com.smartresume.ai.dto.AiDtos.AiResumeRequirementMatch;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreSuggestionGroup;
import com.smartresume.ai.dto.AiDtos.AiResumeSectionHeatmap;
import com.smartresume.ai.dto.AiDtos.PersistedAiResumeScoreResponse;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreRequest;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreResponse;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.ai.mapper.AiResumeScoreMapper;
import com.smartresume.ai.memory.AiConversationIdGenerator;
import com.smartresume.ai.memory.AiFeatureType;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.resume.domain.ResumeEntity;
import com.smartresume.resume.service.ResumeContentService;
import com.smartresume.resume.service.ResumeLookupService;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
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
        - If a Target Job Description is provided, also return a JD match heatmap:
          - heatmapSummary: one short sentence summarizing JD fit and main gaps
          - requirementMatches: 5-10 important JD requirements or keywords
            * text: the requirement or keyword phrase
            * category: skill, experience, education, seniority, domain, tool, or other
            * importance: high, medium, or low
            * status: matched, partial, or missing
            * score: integer 0-100
            * matchedSections: resume section keys that support the match, using summary, workExperience, projectExperience, education, skills, honors, or certificates
            * evidence: 0-3 short evidence snippets from the resume
            * suggestion: one concrete edit suggestion mapped to the resume
          - sectionHeatmap: one row for each visible resume section that matters
            * sectionKey: summary, workExperience, projectExperience, education, skills, honors, or certificates
            * sectionLabel: short human label
            * score: integer 0-100 for JD support in this section
            * status: strong, medium, weak, or missing
            * matchedCount: number of requirements supported by this section
            * missingCount: number of important gaps related to this section
            * summary: one short explanation
        - If no Target Job Description is provided, set heatmapSummary to null and both heatmap arrays to empty lists

        Output MUST be valid JSON matching the required schema.
        Default to Chinese for all text content.
        """;

    private static final String BULLET_REWRITE_SYSTEM_PROMPT = """
        You are a professional resume text rewrite assistant.
        Rewrite exactly the single resume text span provided by the user.

        Rules:
        - Only improve the text span provided by the user.
        - Preserve the original meaning and facts.
        - Preserve Markdown style when the input is Markdown.
        - Output valid JSON only.
        - The JSON must contain rewrittenText and rationale.
        - rewrittenText must be directly replaceable in the original field.
        - If the input is a single Markdown bullet line, rewrittenText should also be a single Markdown bullet line.
        - rationale must be one short sentence.
        - Default to Chinese for all text content unless the input is clearly English.
        """;

    private final AiChatService aiChatService;
    private final ResumeLookupService resumeLookupService;
    private final ResumeContentService resumeContentService;
    private final AiResumeScoreMapper aiResumeScoreMapper;
    private final ObjectMapper objectMapper;

    public AiResumeScoringService(
        AiChatService aiChatService,
        ResumeLookupService resumeLookupService,
        ResumeContentService resumeContentService,
        AiResumeScoreMapper aiResumeScoreMapper,
        ObjectMapper objectMapper
    ) {
        this.aiChatService = aiChatService;
        this.resumeLookupService = resumeLookupService;
        this.resumeContentService = resumeContentService;
        this.aiResumeScoreMapper = aiResumeScoreMapper;
        this.objectMapper = objectMapper;
    }

    public AiBulletRewriteResponse rewriteBullet(AiBulletRewriteRequest request) {
        long userId = CurrentUserContext.requireUserId();
        ResumeEntity resumeEntity = resumeLookupService.requireResume(request.resumeId(), userId);
        String resumeId = resumeEntity.getId();
        String visibleResumeContentJson = resumeContentService.buildAiVisibleContentJson(resumeEntity);

        String conversationId = AiConversationIdGenerator.generate(resumeId, AiFeatureType.RESUME_BULLET_REWRITE);
        String userMessage = buildBulletRewriteUserMessage(request.text(), request.section(), request.index(), visibleResumeContentJson);

        AiInvocationRequest invocationRequest = new AiInvocationRequest(
            BULLET_REWRITE_SYSTEM_PROMPT,
            userMessage,
            conversationId
        );

        return aiChatService.callStructured(invocationRequest, AiBulletRewriteResponse.class);
    }

    public AiResumeScoreResponse scoreResume(AiResumeScoreRequest request) {
        long userId = CurrentUserContext.requireUserId();
        ResumeEntity resumeEntity = resumeLookupService.requireResume(request.resumeId(), userId);
        boolean jobDescriptionProvided = StringUtils.hasText(request.jobDescription());
        String resumeId = resumeEntity.getId();
        String visibleResumeContentJson = resumeContentService.buildAiVisibleContentJson(resumeEntity);

        String conversationId = AiConversationIdGenerator.generate(resumeId, AiFeatureType.RESUME_SCORE);
        String userMessage = buildScoringUserMessage(visibleResumeContentJson, request.jobDescription(), jobDescriptionProvided);

        AiInvocationRequest invocationRequest = new AiInvocationRequest(
            SCORING_SYSTEM_PROMPT,
            userMessage,
            conversationId
        );

        log.info("Scoring resume {} with AI (conversationId={})", resumeId, conversationId);

        AiResumeScoreResponse aiResponse = aiChatService.callStructured(invocationRequest, AiResumeScoreResponse.class);

        List<AiResumeRequirementMatch> requirementMatches = jobDescriptionProvided
            ? normalizeRequirementMatches(aiResponse.requirementMatches())
            : List.of();
        List<AiResumeSectionHeatmap> sectionHeatmap = jobDescriptionProvided
            ? normalizeSectionHeatmap(aiResponse.sectionHeatmap())
            : List.of();

        // Force mode to "ai" and ensure generatedAt is set
        AiResumeScoreResponse response = new AiResumeScoreResponse(
            aiResponse.score(),
            aiResponse.summary(),
            normalizeList(aiResponse.strengths()),
            normalizeSuggestionGroups(aiResponse.suggestionGroups()),
            jobDescriptionProvided,
            aiResponse.generatedAt() != null ? aiResponse.generatedAt() : java.time.Instant.now().toString(),
            "ai",
            jobDescriptionProvided ? aiResponse.heatmapSummary() : null,
            requirementMatches,
            sectionHeatmap
        );

        log.info("Resume {} scored: {} (mode={})", resumeId, response.score(), response.mode());
        persistScore(resumeId, userId, request.jobDescription(), response);
        return response;
    }

    public PersistedAiResumeScoreResponse getPersistedScore(String resumeId) {
        long userId = CurrentUserContext.requireUserId();
        resumeLookupService.requireResume(resumeId, userId);
        AiResumeScoreEntity entity = findPersistedScore(resumeId, userId);
        if (entity == null) {
            return null;
        }
        return new PersistedAiResumeScoreResponse(
            entity.getJobDescription(),
            fromJson(entity.getResultJson(), AiResumeScoreResponse.class)
        );
    }

    private String buildScoringUserMessage(String resumeContentJson, String jobDescription, boolean jobDescriptionProvided) {
        StringBuilder sb = new StringBuilder();
        sb.append("Please score the following resume:\n\n");
        sb.append("Resume content JSON:\n").append(resumeContentJson);

        if (jobDescriptionProvided) {
            sb.append("\n\nTarget Job Description:\n").append(jobDescription);
            sb.append("\n\nReturn the JD heatmap fields so the UI can render requirement and section match details.");
        }

        return sb.toString();
    }

    private String buildBulletRewriteUserMessage(
        String text,
        String section,
        Integer index,
        String resumeContentJson
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append("Rewrite this resume text span:\n");
        sb.append("Text:\n").append(text).append('\n');
        if (section != null && !section.isBlank()) {
            sb.append("Section: ").append(section).append('\n');
        }
        if (index != null) {
            sb.append("Index: ").append(index).append('\n');
        }
        sb.append("\nResume content JSON:\n").append(resumeContentJson);
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

    private List<AiResumeScoreSuggestionGroup> normalizeSuggestionGroups(List<AiResumeScoreSuggestionGroup> groups) {
        if (groups == null) {
            return List.of();
        }
        return groups.stream()
            .map(group -> new AiResumeScoreSuggestionGroup(
                group.title(),
                normalizeList(group.suggestions())
            ))
            .toList();
    }

    private List<AiResumeRequirementMatch> normalizeRequirementMatches(List<AiResumeRequirementMatch> matches) {
        if (matches == null) {
            return List.of();
        }
        return matches.stream()
            .map(match -> new AiResumeRequirementMatch(
                match.text(),
                match.category(),
                match.importance(),
                match.status(),
                match.score(),
                normalizeList(match.matchedSections()),
                normalizeList(match.evidence()),
                match.suggestion()
            ))
            .toList();
    }

    private List<AiResumeSectionHeatmap> normalizeSectionHeatmap(List<AiResumeSectionHeatmap> sections) {
        if (sections == null) {
            return List.of();
        }
        return sections.stream()
            .map(section -> new AiResumeSectionHeatmap(
                section.sectionKey(),
                section.sectionLabel(),
                section.score(),
                section.status(),
                section.matchedCount(),
                section.missingCount(),
                section.summary()
            ))
            .toList();
    }

    private List<String> normalizeList(List<String> values) {
        return values == null ? List.of() : values;
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
