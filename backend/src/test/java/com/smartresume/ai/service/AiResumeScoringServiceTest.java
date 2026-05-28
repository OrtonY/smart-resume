package com.smartresume.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartresume.ai.domain.AiResumeScoreEntity;
import com.smartresume.ai.dto.AiDtos.AiResumeContent;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreRequest;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreResponse;
import com.smartresume.ai.dto.AiDtos.AiResumeScoreSuggestionGroup;
import com.smartresume.ai.dto.AiDtos.PersistedAiResumeScoreResponse;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.ai.mapper.AiResumeScoreMapper;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.resume.domain.ResumeEntity;
import com.smartresume.resume.dto.ResumeDtos.CertificateItem;
import com.smartresume.resume.dto.ResumeDtos.EducationItem;
import com.smartresume.resume.dto.ResumeDtos.HonorItem;
import com.smartresume.resume.dto.ResumeDtos.PersonalInfo;
import com.smartresume.resume.dto.ResumeDtos.ProjectExperienceItem;
import com.smartresume.resume.dto.ResumeDtos.SkillItem;
import com.smartresume.resume.dto.ResumeDtos.WorkExperienceItem;
import com.smartresume.resume.service.ResumeContentService;
import com.smartresume.resume.service.ResumeLookupService;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiResumeScoringServiceTest {

    @Mock
    private AiChatService aiChatService;

    @Mock
    private ResumeLookupService resumeLookupService;

    @Mock
    private ResumeContentService resumeContentService;

    @Mock
    private AiResumeScoreMapper aiResumeScoreMapper;

    private AiResumeScoringService service;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        CurrentUserContext.set(new CurrentUserContext.AuthenticatedUser(7L, "tester", false));
        service = new AiResumeScoringService(aiChatService, resumeLookupService, resumeContentService, aiResumeScoreMapper, objectMapper);
        ResumeEntity resume = new ResumeEntity();
        resume.setId("resume-1");
        resume.setUserId(7L);
        lenient().when(resumeLookupService.requireResume(anyString(), anyLong())).thenReturn(resume);
        lenient().when(resumeContentService.buildAiVisibleContentJson(any(ResumeEntity.class))).thenReturn(sampleResumeContentJson());
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

        AiResumeScoreResponse response = service.scoreResume(new AiResumeScoreRequest(null, "resume-1"));

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
            "resume-1"
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

    @Test
    void scoringPromptExcludesHiddenSectionsAndHiddenModuleContent() {
        AiResumeScoreResponse mockResponse = new AiResumeScoreResponse(
            80,
            "Summary",
            List.of("Strength"),
            List.of(new AiResumeScoreSuggestionGroup("Group", List.of("Suggestion"))),
            true,
            Instant.now().toString(),
            "ai"
        );
        when(aiChatService.callStructured(any(AiInvocationRequest.class), eq(AiResumeScoreResponse.class)))
            .thenReturn(mockResponse);
        when(aiResumeScoreMapper.selectOneByQuery(any())).thenReturn(null);

        when(resumeContentService.buildAiVisibleContentJson(any(ResumeEntity.class))).thenReturn("""
            {"personalInfo":{"fullName":"Alex Chen","headline":"Senior Backend Engineer","phone":"13800000000","email":"alex@example.com","city":"Shanghai","website":"https://alex.dev","expectedSalary":"35k-45k","age":"30","avatar":null},"personalSummary":"Visible summary","education":[{"school":"Example University","degree":"Bachelor","major":"CS","startDate":"2012","endDate":"2016","description":""}],"workExperience":[{"company":"Example Corp","role":"Backend Engineer","startDate":"2020","endDate":"2024","description":"Visible work."}],"projectExperience":null,"skills":[{"name":"Java","level":"Expert"}],"honors":null,"certificates":null}
            """.trim());

        service.scoreResume(new AiResumeScoreRequest("Target JD", "resume-1"));

        ArgumentCaptor<AiInvocationRequest> captor = ArgumentCaptor.forClass(AiInvocationRequest.class);
        verify(aiChatService).callStructured(captor.capture(), eq(AiResumeScoreResponse.class));
        String userMessage = captor.getValue().userMessage();

        assertThat(userMessage).doesNotContain("hiddenSections");
        assertThat(userMessage).doesNotContain("avatar-url");
        assertThat(userMessage).contains("Visible summary");
    }

    private String sampleResumeContentJson() {
        AiResumeContent content = new AiResumeContent(
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
        );
        try {
            return objectMapper.writeValueAsString(content);
        } catch (Exception exception) {
            throw new RuntimeException(exception);
        }
    }
}
