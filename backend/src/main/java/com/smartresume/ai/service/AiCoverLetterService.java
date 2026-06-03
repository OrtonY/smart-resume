package com.smartresume.ai.service;

import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.ai.domain.AiCoverLetterEntity;
import com.smartresume.ai.domain.table.AiCoverLetterEntityTableDef;
import com.smartresume.ai.dto.AiDtos.AiCoverLetterGenerateRequest;
import com.smartresume.ai.dto.AiDtos.AiCoverLetterGenerationResult;
import com.smartresume.ai.dto.AiDtos.AiCoverLetterResponse;
import com.smartresume.ai.dto.AiDtos.AiCoverLetterUpdateRequest;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.ai.mapper.AiCoverLetterMapper;
import com.smartresume.ai.memory.AiConversationIdGenerator;
import com.smartresume.ai.memory.AiFeatureType;
import com.smartresume.application.domain.JobApplicationEntity;
import com.smartresume.application.mapper.JobApplicationMapper;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.resume.domain.ResumeEntity;
import com.smartresume.resume.service.ResumeContentService;
import com.smartresume.resume.service.ResumeLookupService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AiCoverLetterService {

    private static final String COVER_LETTER_SYSTEM_PROMPT = """
        You are a professional cover letter writing assistant.
        Write concise, polished, application-ready cover letters from verified resume content.

        Rules:
        - Output valid JSON only.
        - The JSON must contain title and body.
        - Body should be a complete cover letter in plain text with natural paragraphs.
        - Use the selected output language for title and body.
        - Keep the tone professional, confident, and concise.
        - Tailor the letter to the target company, position, job description, and user notes when provided.
        - Use only facts supported by the resume or user-provided target context; do not invent employers, degrees, dates, metrics, or credentials.
        - Do not include Markdown fences, commentary, or placeholders.
        """;

    private final AiChatService aiChatService;
    private final ResumeLookupService resumeLookupService;
    private final ResumeContentService resumeContentService;
    private final AiCoverLetterMapper aiCoverLetterMapper;
    private final JobApplicationMapper jobApplicationMapper;

    public AiCoverLetterService(
        AiChatService aiChatService,
        ResumeLookupService resumeLookupService,
        ResumeContentService resumeContentService,
        AiCoverLetterMapper aiCoverLetterMapper,
        JobApplicationMapper jobApplicationMapper
    ) {
        this.aiChatService = aiChatService;
        this.resumeLookupService = resumeLookupService;
        this.resumeContentService = resumeContentService;
        this.aiCoverLetterMapper = aiCoverLetterMapper;
        this.jobApplicationMapper = jobApplicationMapper;
    }

    @Transactional
    public AiCoverLetterResponse generate(String resumeId, AiCoverLetterGenerateRequest request) {
        long userId = CurrentUserContext.requireUserId();
        ResumeEntity resume = resumeLookupService.requireResume(resumeId, userId);
        String company = requireText(request.company(), "error.ai.coverLetterCompanyRequired");
        String position = requireText(request.position(), "error.ai.coverLetterPositionRequired");
        String outputLanguage = requireText(request.outputLanguage(), "error.ai.coverLetterLanguageRequired");
        String applicationId = trimOrNull(request.applicationId());
        JobApplicationEntity application = validateApplication(applicationId, resume.getId(), userId);

        String visibleResumeContentJson = resumeContentService.buildAiVisibleContentJson(resume);
        String conversationId = AiConversationIdGenerator.generate(resume.getId(), AiFeatureType.RESUME_COVER_LETTER);
        AiInvocationRequest invocationRequest = new AiInvocationRequest(
            COVER_LETTER_SYSTEM_PROMPT,
            buildGenerationUserMessage(
                company,
                position,
                request.jobDescription(),
                request.extraNotes(),
                outputLanguage,
                visibleResumeContentJson,
                application
            ),
            conversationId
        );

        AiCoverLetterGenerationResult aiResult = aiChatService.callStructured(
            invocationRequest,
            AiCoverLetterGenerationResult.class
        );
        String title = requireGeneratedText(aiResult == null ? null : aiResult.title(), "error.ai.coverLetterEmptyTitle");
        String body = requireGeneratedText(aiResult == null ? null : aiResult.body(), "error.ai.coverLetterEmptyBody");

        LocalDateTime now = LocalDateTime.now();
        AiCoverLetterEntity entity = new AiCoverLetterEntity();
        entity.setId(UUID.randomUUID().toString());
        entity.setUserId(userId);
        entity.setResumeId(resume.getId());
        entity.setApplicationId(applicationId);
        entity.setCompany(company);
        entity.setPosition(position);
        entity.setJobDescription(trimOrNull(request.jobDescription()));
        entity.setExtraNotes(trimOrNull(request.extraNotes()));
        entity.setOutputLanguage(outputLanguage);
        entity.setTitle(title);
        entity.setBody(body);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);

        aiCoverLetterMapper.insert(entity);
        return toResponse(entity);
    }

    public List<AiCoverLetterResponse> list(String resumeId) {
        long userId = CurrentUserContext.requireUserId();
        resumeLookupService.requireResume(resumeId, userId);

        AiCoverLetterEntityTableDef table = AiCoverLetterEntityTableDef.AI_COVER_LETTER_ENTITY;
        QueryWrapper query = QueryWrapper.create()
            .where(table.USER_ID.eq(userId))
            .and(table.RESUME_ID.eq(resumeId))
            .orderBy(table.CREATED_AT, false);
        return aiCoverLetterMapper.selectListByQuery(query).stream()
            .map(this::toResponse)
            .toList();
    }

    public AiCoverLetterResponse get(String resumeId, String coverLetterId) {
        long userId = CurrentUserContext.requireUserId();
        resumeLookupService.requireResume(resumeId, userId);
        return toResponse(requireOwnedCoverLetter(resumeId, coverLetterId, userId));
    }

    @Transactional
    public AiCoverLetterResponse update(String resumeId, String coverLetterId, AiCoverLetterUpdateRequest request) {
        long userId = CurrentUserContext.requireUserId();
        resumeLookupService.requireResume(resumeId, userId);
        AiCoverLetterEntity entity = requireOwnedCoverLetter(resumeId, coverLetterId, userId);
        String body = requireText(request.body(), "error.ai.coverLetterBodyRequired");
        String title = trimOrNull(request.title());

        if (title != null) {
            entity.setTitle(title);
        }
        entity.setBody(body);
        entity.setUpdatedAt(LocalDateTime.now());

        aiCoverLetterMapper.update(entity);
        return toResponse(entity);
    }

    @Transactional
    public void delete(String resumeId, String coverLetterId) {
        long userId = CurrentUserContext.requireUserId();
        resumeLookupService.requireResume(resumeId, userId);
        AiCoverLetterEntity entity = requireOwnedCoverLetter(resumeId, coverLetterId, userId);
        aiCoverLetterMapper.deleteById(entity.getId());
    }

    private JobApplicationEntity validateApplication(String applicationId, String resumeId, long userId) {
        if (applicationId == null) {
            return null;
        }
        JobApplicationEntity application = jobApplicationMapper.selectOneById(applicationId);
        if (application == null || !Long.valueOf(userId).equals(application.getUserId())) {
            throw AppException.of(HttpStatus.NOT_FOUND, "error.application.notFound");
        }
        // Linked applications may be unbound, but an application already tied to
        // another resume is rejected to keep cover-letter history resume-scoped.
        if (StringUtils.hasText(application.getResumeId()) && !resumeId.equals(application.getResumeId())) {
            throw AppException.of(HttpStatus.CONFLICT, "error.ai.coverLetterApplicationResumeMismatch");
        }
        return application;
    }

    private AiCoverLetterEntity requireOwnedCoverLetter(String resumeId, String coverLetterId, long userId) {
        AiCoverLetterEntity entity = aiCoverLetterMapper.selectOneById(coverLetterId);
        if (
            entity == null
                || !Long.valueOf(userId).equals(entity.getUserId())
                || !resumeId.equals(entity.getResumeId())
        ) {
            throw AppException.of(HttpStatus.NOT_FOUND, "error.ai.coverLetterNotFound");
        }
        return entity;
    }

    private String buildGenerationUserMessage(
        String company,
        String position,
        String jobDescription,
        String extraNotes,
        String outputLanguage,
        String visibleResumeContentJson,
        JobApplicationEntity application
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append("Target company: ").append(company).append('\n');
        sb.append("Target position: ").append(position).append('\n');
        sb.append("Output language: ").append(outputLanguage).append('\n');
        if (StringUtils.hasText(jobDescription)) {
            sb.append("\nTarget job description:\n").append(jobDescription.trim()).append('\n');
        }
        if (StringUtils.hasText(extraNotes)) {
            sb.append("\nExtra user notes:\n").append(extraNotes.trim()).append('\n');
        }
        if (application != null) {
            sb.append("\nLinked application context:\n");
            sb.append("Status: ").append(nullToEmpty(application.getStatus())).append('\n');
            sb.append("Channel: ").append(nullToEmpty(application.getChannel())).append('\n');
            sb.append("Application notes: ").append(nullToEmpty(application.getNotes())).append('\n');
        }
        sb.append("\nResume content JSON:\n").append(visibleResumeContentJson);
        return sb.toString();
    }

    private AiCoverLetterResponse toResponse(AiCoverLetterEntity entity) {
        return new AiCoverLetterResponse(
            entity.getId(),
            entity.getResumeId(),
            entity.getApplicationId(),
            entity.getCompany(),
            entity.getPosition(),
            entity.getJobDescription(),
            entity.getExtraNotes(),
            entity.getOutputLanguage(),
            entity.getTitle(),
            entity.getBody(),
            entity.getCreatedAt() == null ? null : entity.getCreatedAt().toString(),
            entity.getUpdatedAt() == null ? null : entity.getUpdatedAt().toString()
        );
    }

    private String requireText(String value, String messageKey) {
        if (!StringUtils.hasText(value)) {
            throw AppException.of(HttpStatus.BAD_REQUEST, messageKey);
        }
        return value.trim();
    }

    private String requireGeneratedText(String value, String messageKey) {
        if (!StringUtils.hasText(value)) {
            throw AppException.of(HttpStatus.INTERNAL_SERVER_ERROR, messageKey);
        }
        return value.trim();
    }

    private String trimOrNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
