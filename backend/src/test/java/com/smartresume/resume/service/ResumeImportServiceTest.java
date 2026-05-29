package com.smartresume.resume.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
        resumeImportService = new ResumeImportService(aiChatService, resumeContentService, resumeService);
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
