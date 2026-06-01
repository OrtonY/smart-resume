package com.smartresume.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartresume.ai.dto.AiDtos.AiResumeTranslationRequest;
import com.smartresume.ai.dto.AiDtos.AiResumeTranslationResponse;
import com.smartresume.ai.dto.AiInvocationRequest;
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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiResumeTranslationServiceTest {

    @Mock
    private AiChatService aiChatService;

    @Mock
    private ResumeLookupService resumeLookupService;

    @Mock
    private ResumeContentService resumeContentService;

    private AiResumeTranslationService service;

    @BeforeEach
    void setUp() {
        CurrentUserContext.set(new CurrentUserContext.AuthenticatedUser(7L, "tester", false));
        service = new AiResumeTranslationService(aiChatService, resumeLookupService, resumeContentService);
        ResumeEntity resume = new ResumeEntity();
        resume.setId("resume-1");
        resume.setUserId(7L);
        lenient().when(resumeLookupService.requireResume(anyString(), anyLong())).thenReturn(resume);
        lenient().when(resumeContentService.defaultContent()).thenReturn(emptyContent());
    }

    @AfterEach
    void tearDown() {
        CurrentUserContext.clear();
    }

    @Test
    void translatesResumeAndPreservesProtectedFieldsAndShape() {
        ResumeContentPayload source = sampleContent();
        ResumeContentPayload aiResponse = new ResumeContentPayload(
            new PersonalInfo("Translated Name", "Senior Backend Engineer", "999", "other@example.com", "Beijing", "https://other.test", "100k", "99", "changed-avatar"),
            "Seven years of backend development experience.",
            List.of(new EducationItem("Translated University", "Bachelor", "Computer Science", "2012", "2016", "Hallucinated highlight")),
            List.of(new WorkExperienceItem("Translated Corp", "Backend Engineer", "2020", "2024", "Built platform APIs.")),
            List.of(new ProjectExperienceItem("Translated Platform", "Tech Lead", "2023", "2024", "Led refactor.")),
            List.of(new SkillItem("Java", "Expert")),
            List.of(new HonorItem("Top Performer", "Translated Issuer", "2024", "Delivery quality.")),
            List.of(new CertificateItem("AWS SAA", "Translated AWS", "2024", "changed-id"))
        );
        when(resumeContentService.loadContent("resume-1", 7L)).thenReturn(source);
        when(resumeContentService.toJson(any(ResumeContentPayload.class))).thenReturn("{\"personalSummary\":\"七年后端开发经验\"}");
        when(aiChatService.callStructured(any(AiInvocationRequest.class), eq(ResumeContentPayload.class))).thenReturn(aiResponse);

        AiResumeTranslationResponse response = service.translateResume("resume-1", new AiResumeTranslationRequest("ENGLISH"));

        assertThat(response.targetLanguage()).isEqualTo("ENGLISH");
        assertThat(response.content().personalInfo().fullName()).isEqualTo("张三");
        assertThat(response.content().personalInfo().phone()).isEqualTo("13800000000");
        assertThat(response.content().personalInfo().email()).isEqualTo("zhang@example.com");
        assertThat(response.content().personalInfo().headline()).isEqualTo("Senior Backend Engineer");
        assertThat(response.content().personalInfo().avatar()).isEqualTo("avatar-data");
        assertThat(response.content().education()).hasSize(1);
        assertThat(response.content().education().getFirst().school()).isEqualTo("示例大学");
        assertThat(response.content().education().getFirst().description()).isEmpty();
        assertThat(response.content().workExperience().getFirst().company()).isEqualTo("示例科技");
        assertThat(response.content().projectExperience().getFirst().name()).isEqualTo("招聘平台");
        assertThat(response.content().certificates().getFirst().credentialId()).isEqualTo("aws-saa");

        ArgumentCaptor<AiInvocationRequest> captor = ArgumentCaptor.forClass(AiInvocationRequest.class);
        verify(aiChatService).callStructured(captor.capture(), eq(ResumeContentPayload.class));
        assertThat(captor.getValue().systemPrompt()).contains("Keep empty input fields empty");
        assertThat(captor.getValue().userMessage()).contains("Target language: English");

        ArgumentCaptor<ResumeContentPayload> promptPayloadCaptor = ArgumentCaptor.forClass(ResumeContentPayload.class);
        verify(resumeContentService).toJson(promptPayloadCaptor.capture());
        assertThat(promptPayloadCaptor.getValue().personalInfo().avatar()).isNull();
    }

    @Test
    void rejectsUnsupportedTargetLanguage() {
        assertThatThrownBy(() -> service.translateResume("resume-1", new AiResumeTranslationRequest("JAPANESE")))
            .isInstanceOf(AppException.class)
            .extracting(exception -> ((AppException) exception).getMessageKey())
            .isEqualTo("error.ai.unsupportedTranslationLanguage");
    }

    private ResumeContentPayload sampleContent() {
        return new ResumeContentPayload(
            new PersonalInfo("张三", "高级后端工程师", "13800000000", "zhang@example.com", "上海", "https://example.com", "35k-45k", "30", "avatar-data"),
            "七年后端开发经验。",
            List.of(new EducationItem("示例大学", "本科", "计算机科学", "2012", "2016", "")),
            List.of(new WorkExperienceItem("示例科技", "后端工程师", "2020", "2024", "建设平台服务。")),
            List.of(new ProjectExperienceItem("招聘平台", "技术负责人", "2023", "2024", "负责核心重构。")),
            List.of(new SkillItem("Java", "熟练")),
            List.of(new HonorItem("优秀员工", "示例科技", "2024", "交付质量突出。")),
            List.of(new CertificateItem("AWS SAA", "AWS", "2024", "aws-saa"))
        );
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
