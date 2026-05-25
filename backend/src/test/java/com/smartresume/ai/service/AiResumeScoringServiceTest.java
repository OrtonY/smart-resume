package com.smartresume.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartresume.ai.domain.AiResumeScoreEntity;
import com.smartresume.ai.dto.AiDtos.AiResumeContext;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreRequest;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreResponse;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreSuggestionGroup;
import com.smartresume.ai.dto.AiDtos.PersistedAiResumeScoreResponse;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.ai.mapper.AiResumeScoreMapper;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.resume.dto.ResumeDtos.CertificateItem;
import com.smartresume.resume.dto.ResumeDtos.EducationItem;
import com.smartresume.resume.dto.ResumeDtos.HonorItem;
import com.smartresume.resume.dto.ResumeDtos.PersonalInfo;
import com.smartresume.resume.dto.ResumeDtos.ProjectExperienceItem;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeLayoutPayload;
import com.smartresume.resume.dto.ResumeDtos.SkillItem;
import com.smartresume.resume.dto.ResumeDtos.WorkExperienceItem;
import com.smartresume.resume.service.ResumeService;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiResumeScoringServiceTest {

    @Mock
    private AiChatService aiChatService;

    @Mock
    private ResumeService resumeService;

    @Mock
    private AiResumeScoreMapper aiResumeScoreMapper;

    private AiResumeScoringService service;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        CurrentUserContext.set(new CurrentUserContext.AuthenticatedUser(7L, "tester", false));
        service = new AiResumeScoringService(aiChatService, resumeService, aiResumeScoreMapper, objectMapper);
    }

    @AfterEach
    void tearDown() {
        CurrentUserContext.clear();
    }

    @Test
    void scoresResumeWithoutJobDescription() {
        AiResumeScoreResponse mockResponse = new AiResumeScoreResponse(
            72,
            "The resume has a solid baseline and can improve with clearer outcomes.",
            List.of("Complete work history", "Project experience is present"),
            List.of(
                new AiResumeScoreSuggestionGroup("Content completeness", List.of("Add a stronger personal summary")),
                new AiResumeScoreSuggestionGroup("Expression quality", List.of("Quantify delivery outcomes"))
            ),
            false,
            Instant.now().toString(),
            "ai"
        );

        when(aiChatService.callStructured(any(AiInvocationRequest.class), eq(AiResumeScoreResponse.class)))
            .thenReturn(mockResponse);
        when(aiResumeScoreMapper.selectOneByQuery(any())).thenReturn(null);

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
            "The resume aligns well with the target backend role and has clear structure.",
            List.of("Work experience is relevant", "The JD context was incorporated"),
            List.of(
                new AiResumeScoreSuggestionGroup("Content completeness", List.of("Keep the current structure")),
                new AiResumeScoreSuggestionGroup("JD alignment", List.of("Reorder experience to match the JD"))
            ),
            true,
            Instant.now().toString(),
            "ai"
        );

        when(aiChatService.callStructured(any(AiInvocationRequest.class), eq(AiResumeScoreResponse.class)))
            .thenReturn(mockResponse);
        when(aiResumeScoreMapper.selectOneByQuery(any())).thenReturn(null);

        AiResumeScoreResponse response = service.scoreResume(new AiResumeScoreRequest(
            "Looking for a backend engineer with Spring Boot experience.",
            sampleResumeContext()
        ));

        assertThat(response.mode()).isEqualTo("ai");
        assertThat(response.jobDescriptionProvided()).isTrue();
        assertThat(response.score()).isEqualTo(85);
        assertThat(response.suggestionGroups())
            .extracting(AiResumeScoreSuggestionGroup::title)
            .contains("JD alignment");
    }

    @Test
    void readsPersistedResumeScore() throws Exception {
        AiResumeScoreResponse storedResult = new AiResumeScoreResponse(
            88,
            "Summary",
            List.of("Strength"),
            List.of(new AiResumeScoreSuggestionGroup("Group", List.of("Suggestion"))),
            true,
            Instant.now().toString(),
            "ai"
        );
        AiResumeScoreEntity entity = new AiResumeScoreEntity();
        entity.setResumeId("resume-1");
        entity.setUserId(7L);
        entity.setJobDescription("Backend JD");
        entity.setResultJson(objectMapper.writeValueAsString(storedResult));
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());

        when(aiResumeScoreMapper.selectOneByQuery(any())).thenReturn(entity);

        PersistedAiResumeScoreResponse response = service.getPersistedScore("resume-1");

        assertThat(response).isNotNull();
        assertThat(response.jobDescription()).isEqualTo("Backend JD");
        assertThat(response.result().score()).isEqualTo(88);
        assertThat(response.result().mode()).isEqualTo("ai");
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
