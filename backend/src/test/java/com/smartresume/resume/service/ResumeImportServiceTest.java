package com.smartresume.resume.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartresume.ai.service.AiChatService;
import com.smartresume.common.exception.AppException;
import com.smartresume.resume.dto.ResumeDtos.PersonalInfo;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeDetailResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeLayoutPayload;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class ResumeImportServiceTest {

    @Mock
    private AiChatService aiChatService;

    @Mock
    private ResumeContentService resumeContentService;

    @Mock
    private ResumeService resumeService;

    private ResumeImportService resumeImportService;

    @BeforeEach
    void setUp() {
        resumeImportService = new ResumeImportService(aiChatService, resumeContentService, resumeService, new ObjectMapper());
    }

    @Test
    void importsTxtResumeAndCreatesResumeWithNormalizedContent() {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "alice-resume.txt",
            "text/plain",
            "Alice Example\nSenior Java Engineer\nSpring Boot\nProject delivery and platform work".getBytes()
        );
        ResumeContentPayload defaults = emptyContent();
        ResumeContentPayload aiResponse = new ResumeContentPayload(
            new PersonalInfo("Alice Example", null, null, "alice@example.com", null, null, null, null, null),
            null,
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of()
        );
        ResumeDetailResponse detailResponse = new ResumeDetailResponse(
            "resume-1",
            "alice-resume",
            "pure-form",
            aiResponse,
            new ResumeLayoutPayload(List.of("education", "summary", "workExperience", "projectExperience", "skills", "honors", "certificates"), List.of()),
            LocalDateTime.now(),
            null,
            null
        );

        when(resumeContentService.defaultContent()).thenReturn(defaults);
        when(aiChatService.callStructured(any(), eq(ResumeContentPayload.class))).thenReturn(aiResponse);
        when(resumeService.createResumeFromContent(eq("alice-resume"), eq("pure-form"), any())).thenReturn(detailResponse);

        ResumeDetailResponse result = resumeImportService.importResume(file, "pure-form");

        assertThat(result.id()).isEqualTo("resume-1");
        ArgumentCaptor<ResumeContentPayload> captor = ArgumentCaptor.forClass(ResumeContentPayload.class);
        verify(resumeService).createResumeFromContent(eq("alice-resume"), eq("pure-form"), captor.capture());
        ResumeContentPayload savedPayload = captor.getValue();
        assertThat(savedPayload.personalInfo().fullName()).isEqualTo("Alice Example");
        assertThat(savedPayload.personalInfo().email()).isEqualTo("alice@example.com");
        assertThat(savedPayload.personalInfo().headline()).isEmpty();
        assertThat(savedPayload.personalSummary()).isEmpty();
    }

    @Test
    void importsJsonResumeWithoutAiAndKeepsDefaultLayout() {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "visible-resume.json",
            "application/json",
            """
                {
                  "title": "Visible Resume",
                  "personalInfo": {
                    "fullName": "Alice Example",
                    "headline": "Senior Java Engineer",
                    "email": "alice@example.com"
                  },
                  "personalSummary": "Backend platform engineer.",
                  "workExperience": [
                    {
                      "company": "Acme",
                      "role": "Lead Engineer",
                      "startDate": "2020",
                      "endDate": "Present",
                      "description": "Built hiring systems."
                    }
                  ],
                  "skills": []
                }
                """.getBytes()
        );
        ResumeContentPayload defaults = emptyContent();
        ResumeDetailResponse detailResponse = new ResumeDetailResponse(
            "resume-json",
            "Visible Resume",
            "modern",
            defaults,
            new ResumeLayoutPayload(List.of("education", "summary", "workExperience", "projectExperience", "skills", "honors", "certificates"), List.of()),
            LocalDateTime.now(),
            null,
            null
        );

        when(resumeContentService.defaultContent()).thenReturn(defaults);
        when(resumeService.createResumeFromContent(eq("Visible Resume"), eq("modern"), any())).thenReturn(detailResponse);

        ResumeDetailResponse result = resumeImportService.importResume(file, "modern");

        assertThat(result.id()).isEqualTo("resume-json");
        verify(aiChatService, never()).callStructured(any(), eq(ResumeContentPayload.class));

        ArgumentCaptor<ResumeContentPayload> contentCaptor = ArgumentCaptor.forClass(ResumeContentPayload.class);
        verify(resumeService).createResumeFromContent(eq("Visible Resume"), eq("modern"), contentCaptor.capture());

        ResumeContentPayload savedPayload = contentCaptor.getValue();
        assertThat(savedPayload.personalInfo().fullName()).isEqualTo("Alice Example");
        assertThat(savedPayload.personalInfo().headline()).isEqualTo("Senior Java Engineer");
        assertThat(savedPayload.personalSummary()).isEqualTo("Backend platform engineer.");
        assertThat(savedPayload.workExperience()).hasSize(1);
        assertThat(savedPayload.education()).isEmpty();
    }

    @Test
    void rejectsInvalidJsonResume() {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "resume.json",
            "application/json",
            "[]".getBytes()
        );

        assertThatThrownBy(() -> resumeImportService.importResume(file, "pure-form"))
            .isInstanceOf(AppException.class)
            .extracting(exception -> ((AppException) exception).getMessageKey())
            .isEqualTo("error.resume.importInvalidJson");

        verify(aiChatService, never()).callStructured(any(), eq(ResumeContentPayload.class));
        verify(resumeService, never()).createResumeFromContent(any(), any(), any());
    }

    @Test
    void rejectsUnsupportedFileType() {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "resume.md",
            "text/markdown",
            "# resume".getBytes()
        );

        assertThatThrownBy(() -> resumeImportService.importResume(file, "pure-form"))
            .isInstanceOf(AppException.class)
            .extracting(exception -> ((AppException) exception).getMessageKey())
            .isEqualTo("error.resume.importUnsupportedFileType");

        verify(aiChatService, never()).callStructured(any(), eq(ResumeContentPayload.class));
        verify(resumeService, never()).createResumeFromContent(any(), any(), any());
    }

    @Test
    void rejectsFileWithInsufficientExtractedText() {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "resume.txt",
            "text/plain",
            "too short".getBytes()
        );

        assertThatThrownBy(() -> resumeImportService.importResume(file, "pure-form"))
            .isInstanceOf(AppException.class)
            .extracting(exception -> ((AppException) exception).getMessageKey())
            .isEqualTo("error.resume.importInsufficientText");

        verify(aiChatService, never()).callStructured(any(), eq(ResumeContentPayload.class));
        verify(resumeService, never()).createResumeFromContent(any(), any(), any());
    }

    private ResumeContentPayload emptyContent() {
        return new ResumeContentPayload(
            new PersonalInfo("", "", "", "", "", "", "", "", ""),
            "",
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of()
        );
    }
}
