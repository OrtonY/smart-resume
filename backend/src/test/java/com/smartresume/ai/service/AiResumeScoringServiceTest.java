package com.smartresume.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartresume.ai.dto.AiDtos.AiResumeContext;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreRequest;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreResponse;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreSuggestionGroup;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.resume.dto.ResumeDtos.CertificateItem;
import com.smartresume.resume.dto.ResumeDtos.EducationItem;
import com.smartresume.resume.dto.ResumeDtos.HonorItem;
import com.smartresume.resume.dto.ResumeDtos.PersonalInfo;
import com.smartresume.resume.dto.ResumeDtos.ProjectExperienceItem;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeLayoutPayload;
import com.smartresume.resume.dto.ResumeDtos.SkillItem;
import com.smartresume.resume.dto.ResumeDtos.WorkExperienceItem;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiResumeScoringServiceTest {

    @Mock
    private AiChatService aiChatService;

    private AiResumeScoringService service;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        service = new AiResumeScoringService(aiChatService, objectMapper);
    }

    @Test
    void scoresResumeWithoutJobDescription() {
        AiResumeScoreResponse mockResponse = new AiResumeScoreResponse(
            72,
            "这份简历已有不错基础，但还可以通过补充成果细节来继续提升。",
            List.of("工作经历模块已具备", "项目经历已具备"),
            List.of(
                new AiResumeScoreSuggestionGroup("内容完整性", List.of("补充个人总结")),
                new AiResumeScoreSuggestionGroup("表达优化", List.of("量化成果"))
            ),
            false,
            Instant.now().toString(),
            "ai"
        );

        when(aiChatService.callStructured(any(AiInvocationRequest.class), eq(AiResumeScoreResponse.class)))
            .thenReturn(mockResponse);

        AiResumeScoreResponse response = service.scoreResume(new AiResumeScoreRequest(null, sampleResumeContext()));

        assertThat(response.mode()).isEqualTo("ai");
        assertThat(response.jobDescriptionProvided()).isFalse();
        assertThat(response.score()).isEqualTo(72);
        assertThat(response.summary()).isNotBlank();
        assertThat(response.strengths()).isNotEmpty();
        assertThat(response.suggestionGroups()).isNotEmpty();
    }

    @Test
    void scoresResumeWithJobDescription() {
        AiResumeScoreResponse mockResponse = new AiResumeScoreResponse(
            85,
            "结合目标 JD 看，这份简历已经具备较强的结构完整度。",
            List.of("工作经历模块已具备", "本次评分已结合 JD"),
            List.of(
                new AiResumeScoreSuggestionGroup("内容完整性", List.of("基础结构较完整")),
                new AiResumeScoreSuggestionGroup("JD 定向优化", List.of("根据 JD 调整经历顺序"))
            ),
            true,
            Instant.now().toString(),
            "ai"
        );

        when(aiChatService.callStructured(any(AiInvocationRequest.class), eq(AiResumeScoreResponse.class)))
            .thenReturn(mockResponse);

        AiResumeScoreResponse response = service.scoreResume(new AiResumeScoreRequest(
            "Looking for a backend engineer with Spring Boot experience.",
            sampleResumeContext()
        ));

        assertThat(response.mode()).isEqualTo("ai");
        assertThat(response.jobDescriptionProvided()).isTrue();
        assertThat(response.score()).isEqualTo(85);
        assertThat(response.suggestionGroups())
            .extracting(group -> group.title())
            .contains("JD 定向优化");
    }

    private AiResumeContext sampleResumeContext() {
        return new AiResumeContext(
            "resume-1",
            "Senior Engineer Resume",
            "classic",
            new ResumeContentPayload(
                new PersonalInfo(
                    "Alex Chen",
                    "Senior Backend Engineer",
                    "13800000000",
                    "alex@example.com",
                    "Shanghai",
                    "https://alex.dev",
                    "35k-45k",
                    "30",
                    ""
                ),
                "Seven years of backend development experience with a focus on platform engineering and delivery efficiency.",
                List.of(new EducationItem("Example University", "Bachelor", "Computer Science", "2012", "2016", "Strong CS fundamentals.")),
                List.of(new WorkExperienceItem("Example Corp", "Backend Engineer", "2020", "2024", "Built Spring Boot services and improved delivery speed.")),
                List.of(new ProjectExperienceItem("Scoring Platform", "Tech Lead", "2023", "2024", "Led platform refactor and stabilized core APIs.")),
                List.of(new SkillItem("Java", "Expert"), new SkillItem("Spring Boot", "Advanced"), new SkillItem("PostgreSQL", "Advanced")),
                List.of(new HonorItem("Top Performer", "Example Corp", "2024", "Recognized for delivery quality.")),
                List.of(new CertificateItem("AWS SAA", "AWS", "2024", "aws-saa"))
            ),
            new ResumeLayoutPayload(
                List.of("education", "summary", "workExperience", "projectExperience", "skills", "honors", "certificates"),
                List.of()
            )
        );
    }
}
