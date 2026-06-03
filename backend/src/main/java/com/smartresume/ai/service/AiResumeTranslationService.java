package com.smartresume.ai.service;

import com.smartresume.ai.dto.AiDtos.AiResumeTranslationRequest;
import com.smartresume.ai.dto.AiDtos.AiResumeTranslationResponse;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.ai.memory.AiConversationIdGenerator;
import com.smartresume.ai.memory.AiFeatureType;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.resume.domain.ResumeEntity;
import com.smartresume.resume.dto.ResumeDtos.CertificateItem;
import com.smartresume.resume.dto.ResumeDtos.EducationItem;
import com.smartresume.resume.dto.ResumeDtos.HonorItem;
import com.smartresume.resume.dto.ResumeDtos.PersonalInfo;
import com.smartresume.resume.dto.ResumeDtos.ProjectExperienceItem;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.SkillItem;
import com.smartresume.resume.dto.ResumeDtos.WorkExperienceItem;
import com.smartresume.resume.service.ResumeContentService;
import com.smartresume.resume.service.ResumeLookupService;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class AiResumeTranslationService {

    private static final String TRANSLATION_SYSTEM_PROMPT = """
        You are a professional resume translation assistant.
        Translate the provided structured resume content into the target language.

        Rules:
        - Output valid JSON only.
        - The JSON must match the ResumeContentPayload schema exactly.
        - Preserve the original facts; never add, remove, or invent entries.
        - Preserve the number and order of all list items.
        - Preserve Markdown formatting and bullet style.
        - Keep empty input fields empty.
        - Keep full name, phone, email, website, expected salary, age, avatar, school names, company names, project names, issuers, credential IDs, and dates unchanged.
        - Translate readable prose fields such as headline, summary, roles, descriptions, skills, degrees, majors, award names, and certificate names when they have meaningful text.
        """;

    private final AiChatService aiChatService;
    private final ResumeLookupService resumeLookupService;
    private final ResumeContentService resumeContentService;

    public AiResumeTranslationService(
        AiChatService aiChatService,
        ResumeLookupService resumeLookupService,
        ResumeContentService resumeContentService
    ) {
        this.aiChatService = aiChatService;
        this.resumeLookupService = resumeLookupService;
        this.resumeContentService = resumeContentService;
    }

    public AiResumeTranslationResponse translateResume(String resumeId, AiResumeTranslationRequest request) {
        TranslationTarget target = TranslationTarget.from(request.targetLanguage());
        long userId = CurrentUserContext.requireUserId();
        ResumeEntity resume = resumeLookupService.requireResume(resumeId, userId);
        ResumeContentPayload sourceContent = resumeContentService.loadContent(resume.getId(), userId);

        String conversationId = AiConversationIdGenerator.generate(resume.getId(), AiFeatureType.RESUME_TRANSLATION);
        AiInvocationRequest invocationRequest = new AiInvocationRequest(
            TRANSLATION_SYSTEM_PROMPT,
            buildTranslationUserMessage(target, sourceContent),
            conversationId
        );

        ResumeContentPayload translated = aiChatService.callStructured(invocationRequest, ResumeContentPayload.class);
        return new AiResumeTranslationResponse(target.code(), normalizeTranslatedContent(sourceContent, translated));
    }

    private String buildTranslationUserMessage(TranslationTarget target, ResumeContentPayload sourceContent) {
        return """
            Target language: %s

            Resume content JSON:
            %s
            """.formatted(target.label(), resumeContentService.toJson(stripAvatarForAi(sourceContent)));
    }

    private ResumeContentPayload stripAvatarForAi(ResumeContentPayload sourceContent) {
        ResumeContentPayload safeSource = sourceContent == null ? resumeContentService.defaultContent() : sourceContent;
        PersonalInfo personalInfo = safeSource.personalInfo();
        PersonalInfo safePersonalInfo = personalInfo == null
            ? resumeContentService.defaultContent().personalInfo()
            : new PersonalInfo(
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
        return new ResumeContentPayload(
            safePersonalInfo,
            safeSource.personalSummary(),
            safeSource.education(),
            safeSource.workExperience(),
            safeSource.projectExperience(),
            safeSource.skills(),
            safeSource.honors(),
            safeSource.certificates()
        );
    }

    private ResumeContentPayload normalizeTranslatedContent(ResumeContentPayload source, ResumeContentPayload translated) {
        ResumeContentPayload safeSource = source == null ? resumeContentService.defaultContent() : source;
        ResumeContentPayload safeTranslated = translated == null ? resumeContentService.defaultContent() : translated;
        return new ResumeContentPayload(
            normalizePersonalInfo(safeSource.personalInfo(), safeTranslated.personalInfo()),
            translatedOrSource(safeSource.personalSummary(), safeTranslated.personalSummary()),
            normalizeEducation(safeSource.education(), safeTranslated.education()),
            normalizeWorkExperience(safeSource.workExperience(), safeTranslated.workExperience()),
            normalizeProjectExperience(safeSource.projectExperience(), safeTranslated.projectExperience()),
            normalizeSkills(safeSource.skills(), safeTranslated.skills()),
            normalizeHonors(safeSource.honors(), safeTranslated.honors()),
            normalizeCertificates(safeSource.certificates(), safeTranslated.certificates())
        );
    }

    private PersonalInfo normalizePersonalInfo(PersonalInfo source, PersonalInfo translated) {
        PersonalInfo safeSource = source == null ? resumeContentService.defaultContent().personalInfo() : source;
        PersonalInfo safeTranslated = translated == null ? resumeContentService.defaultContent().personalInfo() : translated;
        return new PersonalInfo(
            preserve(safeSource.fullName()),
            translatedOrSource(safeSource.headline(), safeTranslated.headline()),
            preserve(safeSource.phone()),
            preserve(safeSource.email()),
            preserve(safeSource.city()),
            preserve(safeSource.website()),
            preserve(safeSource.expectedSalary()),
            preserve(safeSource.age()),
            preserve(safeSource.avatar())
        );
    }

    private List<EducationItem> normalizeEducation(List<EducationItem> source, List<EducationItem> translated) {
        return normalizeBySource(source, translated, (sourceItem, translatedItem) -> new EducationItem(
            preserve(sourceItem.school()),
            translatedOrSource(sourceItem.degree(), translatedItem.degree()),
            translatedOrSource(sourceItem.major(), translatedItem.major()),
            preserve(sourceItem.startDate()),
            preserve(sourceItem.endDate()),
            translatedOrSource(sourceItem.description(), translatedItem.description())
        ));
    }

    private List<WorkExperienceItem> normalizeWorkExperience(List<WorkExperienceItem> source, List<WorkExperienceItem> translated) {
        return normalizeBySource(source, translated, (sourceItem, translatedItem) -> new WorkExperienceItem(
            preserve(sourceItem.company()),
            translatedOrSource(sourceItem.role(), translatedItem.role()),
            preserve(sourceItem.startDate()),
            preserve(sourceItem.endDate()),
            translatedOrSource(sourceItem.description(), translatedItem.description())
        ));
    }

    private List<ProjectExperienceItem> normalizeProjectExperience(
        List<ProjectExperienceItem> source,
        List<ProjectExperienceItem> translated
    ) {
        return normalizeBySource(source, translated, (sourceItem, translatedItem) -> new ProjectExperienceItem(
            preserve(sourceItem.name()),
            translatedOrSource(sourceItem.role(), translatedItem.role()),
            preserve(sourceItem.startDate()),
            preserve(sourceItem.endDate()),
            translatedOrSource(sourceItem.description(), translatedItem.description())
        ));
    }

    private List<SkillItem> normalizeSkills(List<SkillItem> source, List<SkillItem> translated) {
        return normalizeBySource(source, translated, (sourceItem, translatedItem) -> new SkillItem(
            translatedOrSource(sourceItem.name(), translatedItem.name()),
            translatedOrSource(sourceItem.level(), translatedItem.level())
        ));
    }

    private List<HonorItem> normalizeHonors(List<HonorItem> source, List<HonorItem> translated) {
        return normalizeBySource(source, translated, (sourceItem, translatedItem) -> new HonorItem(
            translatedOrSource(sourceItem.title(), translatedItem.title()),
            preserve(sourceItem.issuer()),
            preserve(sourceItem.awardedAt()),
            translatedOrSource(sourceItem.description(), translatedItem.description())
        ));
    }

    private List<CertificateItem> normalizeCertificates(List<CertificateItem> source, List<CertificateItem> translated) {
        return normalizeBySource(source, translated, (sourceItem, translatedItem) -> new CertificateItem(
            translatedOrSource(sourceItem.name(), translatedItem.name()),
            preserve(sourceItem.issuer()),
            preserve(sourceItem.issuedAt()),
            preserve(sourceItem.credentialId())
        ));
    }

    private <T> List<T> normalizeBySource(List<T> source, List<T> translated, ItemNormalizer<T> normalizer) {
        List<T> safeSource = source == null ? List.of() : source;
        List<T> safeTranslated = translated == null ? List.of() : translated;
        return java.util.stream.IntStream.range(0, safeSource.size())
            .mapToObj(index -> {
                T sourceItem = safeSource.get(index);
                T translatedItem = index < safeTranslated.size() ? safeTranslated.get(index) : sourceItem;
                return normalizer.normalize(sourceItem, translatedItem == null ? sourceItem : translatedItem);
            })
            .toList();
    }

    private String preserve(String source) {
        return source == null ? "" : source;
    }

    private String translatedOrSource(String source, String translated) {
        if (source == null || source.isBlank()) {
            return "";
        }
        if (translated == null || translated.isBlank()) {
            return source;
        }
        return translated;
    }

    private enum TranslationTarget {
        ENGLISH("ENGLISH", "English"),
        CHINESE("CHINESE", "Chinese");

        private final String code;
        private final String label;

        TranslationTarget(String code, String label) {
            this.code = code;
            this.label = label;
        }

        static TranslationTarget from(String raw) {
            if (raw == null) {
                throw AppException.of(HttpStatus.BAD_REQUEST, "error.ai.unsupportedTranslationLanguage");
            }
            String normalized = raw.trim().toUpperCase(Locale.ROOT);
            for (TranslationTarget target : values()) {
                if (target.code.equals(normalized)) {
                    return target;
                }
            }
            throw AppException.of(HttpStatus.BAD_REQUEST, "error.ai.unsupportedTranslationLanguage");
        }

        String code() {
            return code;
        }

        String label() {
            return label;
        }
    }

    @FunctionalInterface
    private interface ItemNormalizer<T> {
        T normalize(T source, T translated);
    }
}
