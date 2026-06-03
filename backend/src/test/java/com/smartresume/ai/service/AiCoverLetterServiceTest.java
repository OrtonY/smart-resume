package com.smartresume.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartresume.ai.domain.AiCoverLetterEntity;
import com.smartresume.ai.dto.AiDtos.AiCoverLetterGenerateRequest;
import com.smartresume.ai.dto.AiDtos.AiCoverLetterGenerationResult;
import com.smartresume.ai.dto.AiDtos.AiCoverLetterResponse;
import com.smartresume.ai.dto.AiDtos.AiCoverLetterUpdateRequest;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.ai.mapper.AiCoverLetterMapper;
import com.smartresume.application.domain.JobApplicationEntity;
import com.smartresume.application.mapper.JobApplicationMapper;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.resume.domain.ResumeEntity;
import com.smartresume.resume.service.ResumeContentService;
import com.smartresume.resume.service.ResumeLookupService;
import java.time.LocalDateTime;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiCoverLetterServiceTest {

    @Mock
    private AiChatService aiChatService;

    @Mock
    private ResumeLookupService resumeLookupService;

    @Mock
    private ResumeContentService resumeContentService;

    @Mock
    private AiCoverLetterMapper aiCoverLetterMapper;

    @Mock
    private JobApplicationMapper jobApplicationMapper;

    private AiCoverLetterService service;

    @BeforeEach
    void setUp() {
        CurrentUserContext.set(new CurrentUserContext.AuthenticatedUser(7L, "tester", false));
        service = new AiCoverLetterService(
            aiChatService,
            resumeLookupService,
            resumeContentService,
            aiCoverLetterMapper,
            jobApplicationMapper
        );
        ResumeEntity resume = new ResumeEntity();
        resume.setId("resume-1");
        resume.setUserId(7L);
        lenient().when(resumeLookupService.requireResume(anyString(), anyLong())).thenReturn(resume);
        lenient().when(resumeContentService.buildAiVisibleContentJson(any(ResumeEntity.class)))
            .thenReturn("{\"personalSummary\":\"Backend engineer\"}");
    }

    @AfterEach
    void tearDown() {
        CurrentUserContext.clear();
    }

    @Test
    void generatesCoverLetterWithStructuredAiAndPersistsRecord() {
        JobApplicationEntity application = application("app-1", 7L, "resume-1");
        when(jobApplicationMapper.selectOneById("app-1")).thenReturn(application);
        when(aiChatService.callStructured(any(AiInvocationRequest.class), eq(AiCoverLetterGenerationResult.class)))
            .thenReturn(new AiCoverLetterGenerationResult(
                "Application for Backend Engineer",
                "Dear Hiring Manager,\n\nI am excited to apply..."
            ));

        AiCoverLetterResponse response = service.generate("resume-1", new AiCoverLetterGenerateRequest(
            "app-1",
            "Example Corp",
            "Backend Engineer",
            "Build Java services.",
            "Mention platform experience.",
            "English"
        ));

        assertThat(response.id()).isNotBlank();
        assertThat(response.resumeId()).isEqualTo("resume-1");
        assertThat(response.applicationId()).isEqualTo("app-1");
        assertThat(response.company()).isEqualTo("Example Corp");
        assertThat(response.position()).isEqualTo("Backend Engineer");
        assertThat(response.outputLanguage()).isEqualTo("English");
        assertThat(response.title()).isEqualTo("Application for Backend Engineer");
        assertThat(response.body()).contains("Dear Hiring Manager");

        ArgumentCaptor<AiInvocationRequest> requestCaptor = ArgumentCaptor.forClass(AiInvocationRequest.class);
        verify(aiChatService).callStructured(requestCaptor.capture(), eq(AiCoverLetterGenerationResult.class));
        AiInvocationRequest invocationRequest = requestCaptor.getValue();
        assertThat(invocationRequest.systemPrompt()).contains("cover letter");
        assertThat(invocationRequest.conversationId()).contains("resume-1_resume_cover_letter_");
        assertThat(invocationRequest.userMessage()).contains("Target company: Example Corp");
        assertThat(invocationRequest.userMessage()).contains("Output language: English");
        assertThat(invocationRequest.userMessage()).contains("Build Java services.");
        assertThat(invocationRequest.userMessage()).contains("Application notes: Recruiter screen scheduled.");
        assertThat(invocationRequest.userMessage()).contains("Resume content JSON:");

        ArgumentCaptor<AiCoverLetterEntity> entityCaptor = ArgumentCaptor.forClass(AiCoverLetterEntity.class);
        verify(aiCoverLetterMapper).insert(entityCaptor.capture());
        AiCoverLetterEntity persisted = entityCaptor.getValue();
        assertThat(persisted.getUserId()).isEqualTo(7L);
        assertThat(persisted.getResumeId()).isEqualTo("resume-1");
        assertThat(persisted.getApplicationId()).isEqualTo("app-1");
        assertThat(persisted.getBody()).contains("I am excited");
        assertThat(persisted.getCreatedAt()).isNotNull();
        assertThat(persisted.getUpdatedAt()).isNotNull();
    }

    @Test
    void rejectsBlankGenerationInputBeforeCallingAi() {
        assertThatThrownBy(() -> service.generate("resume-1", new AiCoverLetterGenerateRequest(
            null,
            " ",
            "Backend Engineer",
            null,
            null,
            "English"
        )))
            .isInstanceOf(AppException.class)
            .extracting(exception -> ((AppException) exception).getMessageKey())
            .isEqualTo("error.ai.coverLetterCompanyRequired");

        verify(aiChatService, never()).callStructured(any(AiInvocationRequest.class), eq(AiCoverLetterGenerationResult.class));
        verify(aiCoverLetterMapper, never()).insert(any(AiCoverLetterEntity.class));
    }

    @Test
    void rejectsApplicationLinkedToDifferentResume() {
        when(jobApplicationMapper.selectOneById("app-1")).thenReturn(application("app-1", 7L, "resume-2"));

        assertThatThrownBy(() -> service.generate("resume-1", new AiCoverLetterGenerateRequest(
            "app-1",
            "Example Corp",
            "Backend Engineer",
            null,
            null,
            "English"
        )))
            .isInstanceOf(AppException.class)
            .extracting(exception -> ((AppException) exception).getMessageKey())
            .isEqualTo("error.ai.coverLetterApplicationResumeMismatch");

        verify(aiChatService, never()).callStructured(any(AiInvocationRequest.class), eq(AiCoverLetterGenerationResult.class));
        verify(aiCoverLetterMapper, never()).insert(any(AiCoverLetterEntity.class));
    }

    @Test
    void updatesOwnedCoverLetterBodyAndKeepsTitleWhenBlank() {
        AiCoverLetterEntity entity = coverLetter("letter-1", 7L, "resume-1");
        entity.setTitle("Original title");
        entity.setBody("Original body");
        when(aiCoverLetterMapper.selectOneById("letter-1")).thenReturn(entity);

        AiCoverLetterResponse response = service.update(
            "resume-1",
            "letter-1",
            new AiCoverLetterUpdateRequest(" ", "Updated body")
        );

        assertThat(response.title()).isEqualTo("Original title");
        assertThat(response.body()).isEqualTo("Updated body");

        ArgumentCaptor<AiCoverLetterEntity> entityCaptor = ArgumentCaptor.forClass(AiCoverLetterEntity.class);
        verify(aiCoverLetterMapper).update(entityCaptor.capture());
        assertThat(entityCaptor.getValue().getTitle()).isEqualTo("Original title");
        assertThat(entityCaptor.getValue().getBody()).isEqualTo("Updated body");
    }

    @Test
    void deleteRejectsCoverLetterOwnedByAnotherUser() {
        when(aiCoverLetterMapper.selectOneById("letter-1")).thenReturn(coverLetter("letter-1", 8L, "resume-1"));

        assertThatThrownBy(() -> service.delete("resume-1", "letter-1"))
            .isInstanceOf(AppException.class)
            .extracting(exception -> ((AppException) exception).getMessageKey())
            .isEqualTo("error.ai.coverLetterNotFound");

        verify(aiCoverLetterMapper, never()).deleteById(anyString());
    }

    private JobApplicationEntity application(String id, long userId, String resumeId) {
        JobApplicationEntity entity = new JobApplicationEntity();
        entity.setId(id);
        entity.setUserId(userId);
        entity.setResumeId(resumeId);
        entity.setStatus("interviewing");
        entity.setChannel("LinkedIn");
        entity.setNotes("Recruiter screen scheduled.");
        return entity;
    }

    private AiCoverLetterEntity coverLetter(String id, long userId, String resumeId) {
        AiCoverLetterEntity entity = new AiCoverLetterEntity();
        entity.setId(id);
        entity.setUserId(userId);
        entity.setResumeId(resumeId);
        entity.setApplicationId(null);
        entity.setCompany("Example Corp");
        entity.setPosition("Backend Engineer");
        entity.setOutputLanguage("English");
        entity.setTitle("Cover letter");
        entity.setBody("Body");
        entity.setCreatedAt(LocalDateTime.now().minusDays(1));
        entity.setUpdatedAt(LocalDateTime.now());
        return entity;
    }
}
