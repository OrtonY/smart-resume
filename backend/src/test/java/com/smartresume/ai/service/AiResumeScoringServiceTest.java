package com.smartresume.ai.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.smartresume.ai.dto.AiDtos.AiResumeContext;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreRequest;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreResponse;
import com.smartresume.resume.dto.ResumeDtos.CertificateItem;
import com.smartresume.resume.dto.ResumeDtos.EducationItem;
import com.smartresume.resume.dto.ResumeDtos.HonorItem;
import com.smartresume.resume.dto.ResumeDtos.PersonalInfo;
import com.smartresume.resume.dto.ResumeDtos.ProjectExperienceItem;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeLayoutPayload;
import com.smartresume.resume.dto.ResumeDtos.SkillItem;
import com.smartresume.resume.dto.ResumeDtos.WorkExperienceItem;
import java.util.List;
import org.junit.jupiter.api.Test;

class AiResumeScoringServiceTest {

    private final AiResumeScoringService service = new AiResumeScoringService();

    @Test
    void returnsMockScoreWithoutJobDescription() {
        AiResumeScoreResponse response = service.scoreResume(new AiResumeScoreRequest(null, sampleResumeContext()));

        assertThat(response.mode()).isEqualTo("mock");
        assertThat(response.jobDescriptionProvided()).isFalse();
        assertThat(response.score()).isBetween(35, 96);
        assertThat(response.summary()).isNotBlank();
        assertThat(response.strengths()).isNotEmpty();
        assertThat(response.suggestionGroups()).isNotEmpty();
    }

    @Test
    void includesJobDescriptionSpecificSuggestionsWhenProvided() {
        AiResumeScoreResponse response = service.scoreResume(new AiResumeScoreRequest(
            "Looking for a backend engineer with Spring Boot, API design, and performance tuning experience.",
            sampleResumeContext()
        ));

        assertThat(response.jobDescriptionProvided()).isTrue();
        assertThat(response.score()).isGreaterThanOrEqualTo(40);
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
