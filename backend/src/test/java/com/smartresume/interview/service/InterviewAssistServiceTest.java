package com.smartresume.interview.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.smartresume.ai.dto.AiDtos.AiChatEvent;
import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.ai.service.AiChatService;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.interview.dto.InterviewAssistDtos.InterviewAssistResponse;
import com.smartresume.interview.dto.InterviewDtos.InterviewCreateRequest;
import com.smartresume.interview.dto.InterviewDtos.InterviewDetailResponse;
import com.smartresume.resume.domain.ResumeEntity;
import com.smartresume.resume.mapper.ResumeMapper;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import reactor.core.publisher.Flux;
import reactor.test.StepVerifier;

@SpringBootTest
class InterviewAssistServiceTest {

    @Autowired
    private InterviewAssistService interviewAssistService;

    @Autowired
    private InterviewService interviewService;

    @Autowired
    private ResumeMapper resumeMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private AiChatService aiChatService;

    @MockitoBean
    private InterviewReportService interviewReportService;

    private String interviewId;
    private String interviewerMessageId;

    @BeforeEach
    void setUp() {
        CurrentUserContext.set(new CurrentUserContext.AuthenticatedUser(1L, "admin", true));

        jdbcTemplate.execute("""
            create table if not exists resumes (
                id varchar(64) primary key,
                title varchar(200) not null,
                template_key varchar(80) not null,
                layout_json text,
                deleted boolean not null default false,
                created_at timestamp not null,
                updated_at timestamp not null,
                deleted_at timestamp null
            )
            """);
        jdbcTemplate.execute("""
            create table if not exists interview_sessions (
                id varchar(64) primary key,
                resume_id varchar(64) null,
                title varchar(200) not null,
                ai_conversation_id varchar(128) not null unique,
                job_description text,
                target_company varchar(200),
                difficulty varchar(20) not null,
                interviewer_roles_json text not null,
                company_context_summary_json text,
                company_context_status varchar(30),
                active_round_index integer not null default 0,
                status varchar(30) not null,
                report_status varchar(30) not null,
                report_content text null,
                total_elapsed_seconds integer not null default 0,
                last_resumed_at timestamp null,
                created_at timestamp not null,
                updated_at timestamp not null,
                ended_at timestamp null
            )
            """);
        jdbcTemplate.execute("alter table interview_sessions add column if not exists target_company varchar(200)");
        jdbcTemplate.execute("alter table interview_sessions add column if not exists company_context_summary_json text");
        jdbcTemplate.execute("alter table interview_sessions add column if not exists company_context_status varchar(30)");
        jdbcTemplate.execute("""
            create table if not exists interview_messages (
                id varchar(64) primary key,
                session_id varchar(64) not null,
                role varchar(30) not null,
                content text not null,
                sort_order integer not null,
                round_index integer null,
                created_at timestamp not null,
                status varchar(30) null
            )
            """);
        jdbcTemplate.execute("""
            create table if not exists interview_round_topics (
                id varchar(36) primary key,
                session_id varchar(36) not null,
                round_index int not null,
                topics_json text not null default '[]'
            )
            """);
        jdbcTemplate.execute("""
            create table if not exists interview_ai_assists (
                id varchar(64) primary key,
                message_id varchar(64) not null,
                session_id varchar(64) not null,
                user_id bigint not null,
                answer_content text null,
                answer_status varchar(20) not null default 'PENDING',
                candidate_answer text null,
                score int null,
                feedback text null,
                score_status varchar(20) not null default 'PENDING',
                created_at timestamp not null,
                updated_at timestamp not null
            )
            """);
        jdbcTemplate.execute("""
            create table if not exists SPRING_AI_CHAT_MEMORY (
                conversation_id varchar(128) not null,
                content text not null,
                type varchar(10) not null,
                timestamp timestamp not null
            )
            """);

        jdbcTemplate.update("delete from interview_ai_assists");
        jdbcTemplate.update("delete from SPRING_AI_CHAT_MEMORY");
        jdbcTemplate.update("delete from interview_round_topics");
        jdbcTemplate.update("delete from interview_messages");
        jdbcTemplate.update("delete from interview_sessions");
        jdbcTemplate.update("delete from resumes");

        when(aiChatService.call(any(AiInvocationRequest.class)))
            .thenReturn("你好，请先做一个简短的自我介绍。");
        when(aiChatService.callStructured(any(AiInvocationRequest.class), any())).thenReturn(null);

        String resumeId = createResume("测试简历");
        InterviewDetailResponse created = interviewService.createInterview(new InterviewCreateRequest(
            resumeId, null, "测试面试", "Java 后端开发", "MEDIUM", List.of("Leader")
        ));
        interviewId = created.id();
        interviewerMessageId = created.messages().getFirst().id();
    }

    @AfterEach
    void tearDown() {
        CurrentUserContext.clear();
    }

    @Test
    void getAssistReturnsEmptyWhenNoRowExists() {
        InterviewAssistResponse response = interviewAssistService.getAssist(interviewId, interviewerMessageId);

        assertThat(response.id()).isNull();
        assertThat(response.messageId()).isEqualTo(interviewerMessageId);
        assertThat(response.answerStatus()).isEqualTo("PENDING");
        assertThat(response.scoreStatus()).isEqualTo("PENDING");
        assertThat(response.answerContent()).isNull();
        assertThat(response.score()).isNull();
    }

    @Test
    void streamAnswerPersistsRowOnCompletion() {
        when(aiChatService.stream(any(AiInvocationRequest.class)))
            .thenReturn(Flux.just(
                new AiChatEvent("message", "这是", null),
                new AiChatEvent("message", "参考答案", null),
                new AiChatEvent("done", "", null)
            ));

        Flux<AiChatEvent> flux = interviewAssistService.streamAnswer(interviewId, interviewerMessageId);
        StepVerifier.create(flux)
            .expectNextCount(3)
            .verifyComplete();

        InterviewAssistResponse response = interviewAssistService.getAssist(interviewId, interviewerMessageId);
        assertThat(response.answerStatus()).isEqualTo("READY");
        assertThat(response.answerContent()).isEqualTo("这是参考答案");
    }

    @Test
    void streamScoreRejectsEmptyCandidateAnswer() {
        assertThatThrownBy(() -> interviewAssistService.streamScore(interviewId, interviewerMessageId, ""))
            .isInstanceOf(AppException.class)
            .hasMessageContaining("请先输入回答");

        assertThatThrownBy(() -> interviewAssistService.streamScore(interviewId, interviewerMessageId, "   "))
            .isInstanceOf(AppException.class);
    }

    @Test
    void streamScoreParsesScoreFromResponse() {
        when(aiChatService.stream(any(AiInvocationRequest.class)))
            .thenReturn(Flux.just(
                new AiChatEvent("message", "SCORE: 85\n\n### 优点\n- 回答清晰", null),
                new AiChatEvent("done", "", null)
            ));

        Flux<AiChatEvent> flux = interviewAssistService.streamScore(interviewId, interviewerMessageId, "我的回答内容");
        StepVerifier.create(flux)
            .expectNextCount(2)
            .verifyComplete();

        InterviewAssistResponse response = interviewAssistService.getAssist(interviewId, interviewerMessageId);
        assertThat(response.scoreStatus()).isEqualTo("READY");
        assertThat(response.score()).isEqualTo(85);
        assertThat(response.feedback()).contains("优点");
        assertThat(response.candidateAnswer()).isEqualTo("我的回答内容");
    }

    @Test
    void streamScoreHandlesMissingScorePrefix() {
        when(aiChatService.stream(any(AiInvocationRequest.class)))
            .thenReturn(Flux.just(
                new AiChatEvent("message", "这是一段没有 SCORE 前缀的反馈", null),
                new AiChatEvent("done", "", null)
            ));

        Flux<AiChatEvent> flux = interviewAssistService.streamScore(interviewId, interviewerMessageId, "我的回答");
        StepVerifier.create(flux)
            .expectNextCount(2)
            .verifyComplete();

        InterviewAssistResponse response = interviewAssistService.getAssist(interviewId, interviewerMessageId);
        assertThat(response.scoreStatus()).isEqualTo("READY");
        assertThat(response.score()).isNull();
        assertThat(response.feedback()).contains("没有 SCORE 前缀");
    }

    @Test
    void streamAnswerIgnoresMalformedSessionJson() {
        when(aiChatService.stream(any(AiInvocationRequest.class)))
            .thenReturn(Flux.just(
                new AiChatEvent("message", "This is ", null),
                new AiChatEvent("message", "a fallback answer.", null),
                new AiChatEvent("done", "", null)
            ));

        jdbcTemplate.update(
            """
                update interview_sessions
                set interviewer_roles_json = ?,
                    company_context_summary_json = ?,
                    company_context_status = ?,
                    target_company = ?
                where id = ?
                """,
            "{bad roles",
            "{bad summary",
            "READY",
            "Acme",
            interviewId
        );

        StepVerifier.create(interviewAssistService.streamAnswer(interviewId, interviewerMessageId))
            .expectNextCount(3)
            .verifyComplete();

        InterviewAssistResponse response = interviewAssistService.getAssist(interviewId, interviewerMessageId);
        assertThat(response.answerStatus()).isEqualTo("READY");
        assertThat(response.answerContent()).isEqualTo("This is a fallback answer.");
    }

    private String createResume(String title) {
        LocalDateTime now = LocalDateTime.now();
        ResumeEntity resume = new ResumeEntity();
        resume.setId(UUID.randomUUID().toString());
        resume.setUserId(1L);
        resume.setTitle(title);
        resume.setTemplateKey("classic");
        resume.setLayoutJson("{\"sectionOrder\":[],\"hiddenSections\":[]}");
        resume.setDeleted(false);
        resume.setCreatedAt(now);
        resume.setUpdatedAt(now);
        resumeMapper.insert(resume);
        return resume.getId();
    }
}
