package com.smartresume.interview.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.smartresume.ai.dto.AiInvocationRequest;
import com.smartresume.ai.service.AiChatService;
import com.smartresume.common.exception.AppException;
import com.smartresume.interview.dto.InterviewDtos.InterviewCreateRequest;
import com.smartresume.interview.dto.InterviewDtos.InterviewDetailResponse;
import com.smartresume.interview.dto.InterviewDtos.InterviewMessageRequest;
import com.smartresume.interview.dto.InterviewDtos.InterviewPageResponse;
import com.smartresume.resume.domain.ResumeEntity;
import com.smartresume.resume.mapper.ResumeMapper;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.ai.chat.memory.repository.jdbc.JdbcChatMemoryRepository;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
class InterviewServiceTest {

    @Autowired
    private InterviewService interviewService;

    @Autowired
    private ResumeMapper resumeMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private JdbcChatMemoryRepository chatMemoryRepository;

    @MockitoBean
    private AiChatService aiChatService;

    @BeforeEach
    void setUpSchema() {
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
                difficulty varchar(20) not null,
                interviewer_roles_json text not null,
                active_round_index integer not null default 0,
                status varchar(30) not null,
                report_status varchar(30) not null,
                report_content text null,
                created_at timestamp not null,
                updated_at timestamp not null,
                ended_at timestamp null
            )
            """);
        jdbcTemplate.execute("""
            create table if not exists interview_messages (
                id varchar(64) primary key,
                session_id varchar(64) not null,
                role varchar(30) not null,
                content text not null,
                sort_order integer not null,
                created_at timestamp not null
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
        jdbcTemplate.update("delete from SPRING_AI_CHAT_MEMORY");
        jdbcTemplate.update("delete from interview_messages");
        jdbcTemplate.update("delete from interview_sessions");
        jdbcTemplate.update("delete from resumes");

        when(aiChatService.call(any(AiInvocationRequest.class)))
            .thenReturn("你好，我是本轮面试官。请先做一个简短的自我介绍。")
            .thenReturn("请详细描述一下你在订单系统优化中的具体贡献。")
            .thenReturn("好的，现在进入下一轮面试。请介绍一下你最有挑战性的项目。");
    }

    @Test
    void createsInterviewAndDrivesLifecycleWithAiMessages() {
        String resumeId = createResume("Java 后端简历");

        InterviewDetailResponse created = interviewService.createInterview(new InterviewCreateRequest(
            resumeId,
            "Java 后端一面",
            "负责 Spring Boot 服务开发和 PostgreSQL 数据建模",
            "medium",
            List.of("Leader", "项目深挖")
        ));

        assertThat(created.resumeId()).isEqualTo(resumeId);
        assertThat(created.resumeTitle()).isEqualTo("Java 后端简历");
        assertThat(created.aiConversationId()).startsWith("interview-");
        assertThat(created.interviewerRoles()).containsExactly("Leader", "项目深挖");
        assertThat(created.activeRoundIndex()).isZero();
        assertThat(created.status()).isEqualTo("IN_PROGRESS");
        assertThat(created.reportStatus()).isEqualTo("PENDING");
        assertThat(created.messages()).hasSize(1);
        assertThat(created.messages().getFirst().role()).isEqualTo("INTERVIEWER");

        InterviewDetailResponse answered = interviewService.submitMessage(
            created.id(),
            new InterviewMessageRequest("我负责过订单系统的性能优化。")
        );
        assertThat(answered.messages()).hasSize(3);
        assertThat(answered.messages().get(1).role()).isEqualTo("CANDIDATE");
        assertThat(answered.messages().get(2).role()).isEqualTo("INTERVIEWER");
        assertThat(chatMemoryRepository.findByConversationId(created.aiConversationId())).hasSize(3);

        InterviewDetailResponse secondRound = interviewService.nextRound(created.id());
        assertThat(secondRound.activeRoundIndex()).isEqualTo(1);
        assertThat(secondRound.messages()).hasSize(4);
        assertThat(chatMemoryRepository.findByConversationId(created.aiConversationId())).hasSize(4);

        InterviewDetailResponse paused = interviewService.pauseInterview(created.id());
        assertThat(paused.status()).isEqualTo("PAUSED");

        InterviewDetailResponse continued = interviewService.continueInterview(created.id());
        assertThat(continued.status()).isEqualTo("IN_PROGRESS");

        InterviewDetailResponse ended = interviewService.endInterview(created.id());
        assertThat(ended.status()).isEqualTo("ENDED");
        assertThat(ended.reportStatus()).isEqualTo("PENDING");
        assertThat(ended.endedAt()).isNotNull();

        InterviewPageResponse filtered = interviewService.listInterviews(resumeId, "ENDED", "后端", 1, 6);
        assertThat(filtered.total()).isEqualTo(1);
        assertThat(filtered.items().getFirst().id()).isEqualTo(created.id());
    }

    @Test
    void createsInterviewWithoutJobDescription() {
        when(aiChatService.call(any(AiInvocationRequest.class)))
            .thenReturn("你好，我看了你的简历，请先做一个自我介绍。");

        String resumeId = createResume("前端简历");

        InterviewDetailResponse created = interviewService.createInterview(new InterviewCreateRequest(
            resumeId,
            "前端面试",
            null,
            "EASY",
            List.of("HR")
        ));

        assertThat(created.jobDescription()).isNull();
        assertThat(created.messages()).hasSize(1);
        assertThat(created.messages().getFirst().role()).isEqualTo("INTERVIEWER");
    }

    @Test
    void createsInterviewWithoutResume() {
        when(aiChatService.call(any(AiInvocationRequest.class)))
            .thenReturn("你好，根据 JD 描述，请先做一个自我介绍。");

        InterviewDetailResponse created = interviewService.createInterview(new InterviewCreateRequest(
            null,
            "纯 JD 面试",
            "负责 Spring Boot 微服务开发",
            "MEDIUM",
            List.of("Leader")
        ));

        assertThat(created.resumeId()).isNull();
        assertThat(created.resumeTitle()).isNull();
        assertThat(created.jobDescription()).isEqualTo("负责 Spring Boot 微服务开发");
        assertThat(created.messages()).hasSize(1);
        assertThat(created.messages().getFirst().role()).isEqualTo("INTERVIEWER");
    }

    @Test
    void throwsWhenBothResumeAndJobDescriptionMissing() {
        assertThatThrownBy(() -> interviewService.createInterview(new InterviewCreateRequest(
            null,
            "无效面试",
            null,
            "EASY",
            List.of("HR")
        )))
            .isInstanceOf(AppException.class)
            .hasMessageContaining("简历和 JD 至少填写一个");
    }

    private String createResume(String title) {
        LocalDateTime now = LocalDateTime.now();
        ResumeEntity resume = new ResumeEntity();
        resume.setId(UUID.randomUUID().toString());
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
