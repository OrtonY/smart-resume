package com.smartresume.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.smartresume.ai.dto.suggestion.AiResumeSuggestion;
import com.smartresume.resume.dto.ResumeDtos.CertificateItem;
import com.smartresume.resume.dto.ResumeDtos.EducationItem;
import com.smartresume.resume.dto.ResumeDtos.HonorItem;
import com.smartresume.resume.dto.ResumeDtos.PersonalInfo;
import com.smartresume.resume.dto.ResumeDtos.ProjectExperienceItem;
import com.smartresume.resume.dto.ResumeDtos.SkillItem;
import com.smartresume.resume.dto.ResumeDtos.WorkExperienceItem;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public final class AiDtos {

    private static final List<String> AI_VISIBLE_SECTION_KEYS = List.of(
        "education",
        "summary",
        "workExperience",
        "projectExperience",
        "skills",
        "honors",
        "certificates"
    );

    private AiDtos() {
    }

    public record AiConfigurationResponse(
        String vendor,
        String baseUrl,
        String modelName,
        boolean configured
    ) {
    }

    public record AiConfigurationRequest(
        @NotBlank(message = "{validation.ai.vendorRequired}")
        String vendor,
        String baseUrl,
        String apiKey,
        String modelName
    ) {
    }

    public record AiChatRequest(
        @NotBlank(message = "{validation.ai.messageRequired}")
        String message,
        String conversationId,
        @NotBlank(message = "{validation.ai.resumeIdRequired}")
        String resumeId,
        String style
    ) {
    }

    public record AiResumeScoreRequest(
        String jobDescription,
        @NotBlank(message = "{validation.ai.resumeIdRequired}")
        String resumeId
    ) {
    }

    public record AiBulletRewriteRequest(
        @NotBlank(message = "{validation.ai.resumeIdRequired}")
        String resumeId,
        @NotBlank(message = "{validation.ai.bulletTextRequired}")
        String text,
        String section,
        Integer index
    ) {
    }

    public record AiBulletRewriteResponse(
        String rewrittenText,
        String rationale
    ) {
    }

    public record AiResumeTranslationRequest(
        @NotBlank(message = "{validation.ai.translationLanguageRequired}")
        String targetLanguage
    ) {
    }

    public record AiResumeTranslationResponse(
        String targetLanguage,
        ResumeContentPayload content
    ) {
    }

    public record AiResumeContext(
        @NotBlank(message = "{validation.ai.resumeIdRequired}")
        String id,
        @NotBlank(message = "{validation.ai.resumeTitleRequired}")
        String title,
        @NotBlank(message = "{validation.ai.templateKeyRequired}")
        String templateKey,
        @NotNull(message = "{validation.ai.resumeContentRequired}")
        @Valid
        AiResumeContent content,
        @NotNull(message = "{validation.ai.resumeLayoutRequired}")
        @Valid
        AiResumeLayout layout
    ) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record AiResumeContent(
        @Valid PersonalInfo personalInfo,
        String personalSummary,
        List<@Valid EducationItem> education,
        List<@Valid WorkExperienceItem> workExperience,
        List<@Valid ProjectExperienceItem> projectExperience,
        List<@Valid SkillItem> skills,
        List<@Valid HonorItem> honors,
        List<@Valid CertificateItem> certificates
    ) {
    }

    public record AiResumeLayout(
        List<@NotBlank(message = "{validation.ai.resumeLayoutRequired}") String> sectionOrder
    ) {
    }

    public record AiChatMessage(String role, String content, List<AiResumeSuggestion> suggestions) {
    }

    public record AiChatConversation(
        String conversationId,
        String title,
        String style,
        String createdAt,
        String updatedAt
    ) {
    }

    public record AiChatEvent(String type, String content, String conversationId) {
    }

    public record AiChatCompletionResponse(
        String content,
        String suggestionJson,
        String conversationId
    ) {
    }

    public record AiSuggestionStatusUpdateRequest(
        @NotBlank(message = "{validation.ai.suggestionStatusRequired}")
        String status
    ) {
    }

    public record AiResumeScoreSuggestionGroup(
        String title,
        List<String> suggestions
    ) {
    }

    public record AiResumeRequirementMatch(
        String text,
        String category,
        String importance,
        String status,
        int score,
        List<String> matchedSections,
        List<String> evidence,
        String suggestion
    ) {
    }

    public record AiResumeSectionHeatmap(
        String sectionKey,
        String sectionLabel,
        int score,
        String status,
        int matchedCount,
        int missingCount,
        String summary
    ) {
    }

    public record AiResumeScoreResponse(
        int score,
        String summary,
        List<String> strengths,
        List<AiResumeScoreSuggestionGroup> suggestionGroups,
        boolean jobDescriptionProvided,
        String generatedAt,
        String mode,
        String heatmapSummary,
        List<AiResumeRequirementMatch> requirementMatches,
        List<AiResumeSectionHeatmap> sectionHeatmap
    ) {
        public AiResumeScoreResponse(
            int score,
            String summary,
            List<String> strengths,
            List<AiResumeScoreSuggestionGroup> suggestionGroups,
            boolean jobDescriptionProvided,
            String generatedAt,
            String mode
        ) {
            this(score, summary, strengths, suggestionGroups, jobDescriptionProvided, generatedAt, mode, null, null, null);
        }
    }

    public record PersistedAiResumeScoreResponse(
        String jobDescription,
        AiResumeScoreResponse result
    ) {
    }

    // --- Vendor metadata and model listing DTOs ---

    public record VendorMetadataResponse(
        String vendor,
        String defaultBaseUrl,
        String baseUrlPlaceholder,
        String apiKeyPlaceholder,
        String modelNamePlaceholder,
        boolean apiKeyRequired,
        List<String> suggestedModels
    ) {
    }

    public record ListModelsRequest(
        @NotBlank(message = "{validation.ai.vendorRequired}")
        String vendor,
        String baseUrl,
        String apiKey
    ) {
    }

    public record ListModelsResponse(List<String> models) {
    }

    public static AiResumeContent fromResumeContentPayload(ResumeContentPayload content, List<String> visibleSectionOrder) {
        if (content == null) {
            return new AiResumeContent(null, null, null, null, null, null, null, null);
        }
        Set<String> visibleSections = new LinkedHashSet<>(visibleSectionOrder);
        return new AiResumeContent(
            sanitizePersonalInfo(content.personalInfo()),
            visibleSections.contains("summary") ? content.personalSummary() : null,
            visibleSections.contains("education") ? content.education() : null,
            visibleSections.contains("workExperience") ? content.workExperience() : null,
            visibleSections.contains("projectExperience") ? content.projectExperience() : null,
            visibleSections.contains("skills") ? content.skills() : null,
            visibleSections.contains("honors") ? content.honors() : null,
            visibleSections.contains("certificates") ? content.certificates() : null
        );
    }

    public static AiResumeLayout fromVisibleSectionOrder(List<String> sectionOrder) {
        return sanitizeLayout(new AiResumeLayout(sectionOrder));
    }

    private static AiResumeLayout sanitizeLayout(AiResumeLayout layout) {
        List<String> sectionOrder = layout == null || layout.sectionOrder() == null
            ? List.of()
            : normalizeVisibleSectionOrder(layout.sectionOrder());
        return new AiResumeLayout(sectionOrder);
    }

    private static List<String> normalizeVisibleSectionOrder(List<String> sectionOrder) {
        List<String> normalized = new ArrayList<>();
        for (String section : sectionOrder) {
            if (section != null && AI_VISIBLE_SECTION_KEYS.contains(section) && !normalized.contains(section)) {
                normalized.add(section);
            }
        }
        return List.copyOf(normalized);
    }

    private static PersonalInfo sanitizePersonalInfo(PersonalInfo personalInfo) {
        if (personalInfo == null) {
            return null;
        }
        return new PersonalInfo(
            personalInfo.fullName(),
            personalInfo.headline(),
            personalInfo.phone(),
            personalInfo.email(),
            personalInfo.city(),
            personalInfo.website(),
            personalInfo.expectedSalary(),
            personalInfo.age(),
            null
        );
    }
}
