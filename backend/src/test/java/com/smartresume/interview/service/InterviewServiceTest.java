package com.smartresume.interview.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
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
import java.lang.reflect.Constructor;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.chat.memory.repository.jdbc.JdbcChatMemoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
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

    @MockitoBean
    private InterviewReportService interviewReportService;

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
            create table if not exists SPRING_AI_CHAT_MEMORY (
                conversation_id varchar(128) not null,
                content text not null,
                type varchar(10) not null,
                timestamp timestamp not null
            )
            """);

        jdbcTemplate.update("delete from SPRING_AI_CHAT_MEMORY");
        jdbcTemplate.update("delete from interview_round_topics");
        jdbcTemplate.update("delete from interview_messages");
        jdbcTemplate.update("delete from interview_sessions");
        jdbcTemplate.update("delete from resumes");

        when(aiChatService.call(any(AiInvocationRequest.class)))
            .thenReturn("你好，我是本轮面试官。请先做一个简短的自我介绍。")
            .thenReturn("请详细描述一下你在订单系统优化中的关键贡献。")
            .thenReturn("好的，现在进入下一轮，请介绍一个你最有挑战的项目。");
        when(aiChatService.callStructured(any(AiInvocationRequest.class), any())).thenReturn(null);
    }

    @Test
    void createsInterviewAndDrivesLifecycleWithAiMessages() {
        String resumeId = createResume("Java 后端简历");

        InterviewDetailResponse created = interviewService.createInterview(new InterviewCreateRequest(
            resumeId,
            null,
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
        assertThat(created.companyContextStatus()).isEqualTo("NOT_REQUESTED");
        assertThat(created.totalElapsedSeconds()).isZero();
        assertThat(created.lastResumedAt()).isNotNull();
        assertThat(created.messages()).hasSize(1);
        assertThat(created.messages().getFirst().role()).isEqualTo("INTERVIEWER");

        String round0ConversationId = "interview-" + created.id() + "-round-0";

        InterviewDetailResponse answered = interviewService.submitMessage(
            created.id(),
            new InterviewMessageRequest("我负责过订单系统的性能优化。")
        );
        assertThat(answered.messages()).hasSize(3);
        assertThat(answered.messages().get(1).role()).isEqualTo("CANDIDATE");
        assertThat(answered.messages().get(2).role()).isEqualTo("INTERVIEWER");
        assertThat(chatMemoryRepository.findByConversationId(round0ConversationId)).hasSize(3);

        InterviewDetailResponse secondRound = interviewService.nextRound(created.id());
        assertThat(secondRound.activeRoundIndex()).isEqualTo(1);
        assertThat(secondRound.messages()).hasSize(4);
        assertThat(chatMemoryRepository.findByConversationId(round0ConversationId)).hasSize(3);
        assertThat(chatMemoryRepository.findByConversationId("interview-" + created.id() + "-round-1")).hasSize(1);

        InterviewDetailResponse paused = interviewService.pauseInterview(created.id());
        assertThat(paused.status()).isEqualTo("PAUSED");
        assertThat(paused.lastResumedAt()).isNull();
        assertThat(paused.totalElapsedSeconds()).isGreaterThanOrEqualTo(0);

        InterviewDetailResponse continued = interviewService.continueInterview(created.id());
        assertThat(continued.status()).isEqualTo("IN_PROGRESS");
        assertThat(continued.lastResumedAt()).isNotNull();

        InterviewDetailResponse ended = interviewService.endInterview(created.id());
        assertThat(ended.status()).isEqualTo("ENDED");
        assertThat(ended.reportStatus()).isEqualTo("PENDING");
        assertThat(ended.endedAt()).isNotNull();

        InterviewPageResponse filtered = interviewService.listInterviews(resumeId, "ENDED", null, "后端", 1, 6);
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
            null,
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
    void createsInterviewWithCompanyContextWhenAiSummaryReady() {
        String resumeId = createResume("云平台架构师");
        when(aiChatService.callStructured(any(AiInvocationRequest.class), any()))
            .thenAnswer((invocation) -> {
                Class<?> responseType = invocation.getArgument(1);
                if ("CompanyContextSummaryResult".equals(responseType.getSimpleName())) {
                    return instantiatePrivateRecord(
                        "com.smartresume.interview.service.InterviewService$CompanyContextSummaryResult",
                        List.of("主营云基础设施与企业数字化服务", "重视稳定性、规模化和复杂业务场景")
                    );
                }
                return null;
            });

        InterviewDetailResponse created = interviewService.createInterview(new InterviewCreateRequest(
            resumeId,
            "阿里云",
            "云平台后端面试",
            "负责云平台业务服务开发",
            "MEDIUM",
            List.of("Leader", "场景题")
        ));

        assertThat(created.targetCompany()).isEqualTo("阿里云");
        assertThat(created.companyContextStatus()).isEqualTo("READY");
        assertThat(created.companyContextSummary())
            .containsExactly("主营云基础设施与企业数字化服务", "重视稳定性、规模化和复杂业务场景");

        InterviewPageResponse filtered = interviewService.listInterviews(null, null, "阿里云", null, 1, 6);
        assertThat(filtered.total()).isEqualTo(1);
        assertThat(filtered.items().getFirst().targetCompany()).isEqualTo("阿里云");
    }

    @Test
    void stillCreatesInterviewWhenCompanyContextExtractionFails() {
        String resumeId = createResume("搜索推荐工程师");

        InterviewDetailResponse created = interviewService.createInterview(new InterviewCreateRequest(
            resumeId,
            "字节跳动",
            "推荐系统面试",
            "负责推荐链路服务开发",
            "MEDIUM",
            List.of("Leader")
        ));

        assertThat(created.targetCompany()).isEqualTo("字节跳动");
        assertThat(created.companyContextStatus()).isEqualTo("FAILED");
        assertThat(created.companyContextSummary()).isEmpty();
        assertThat(created.messages()).hasSize(1);
    }

    @Test
    void throwsWhenBothResumeAndJobDescriptionMissing() {
        assertThatThrownBy(() -> interviewService.createInterview(new InterviewCreateRequest(
            null,
            null,
            "无效面试",
            null,
            "EASY",
            List.of("HR")
        )))
            .isInstanceOf(AppException.class)
            .hasMessageContaining("简历和 JD 至少填写一个");
    }

    @Test
    void topicExtractionPromptOnlyCountsExplicitlyAnsweredTechQuestions() {
        when(aiChatService.call(any(AiInvocationRequest.class)))
            .thenReturn("你好，请先做一个自我介绍。")
            .thenReturn("请详细描述你在订单系统中的具体贡献。")
            .thenReturn("好的，进入下一轮。");

        String resumeId = createResume("Java 后端简历");

        InterviewDetailResponse created = interviewService.createInterview(new InterviewCreateRequest(
            resumeId,
            null,
            "Java 后端一面",
            "负责 Spring Boot 服务开发和 Redis 缓存优化",
            "MEDIUM",
            List.of("Leader", "项目深挖")
        ));
        interviewService.submitMessage(
            created.id(),
            new InterviewMessageRequest("我在自我介绍中提到过 Spring Boot 和 Redis，但还没有被问到具体技术问题。")
        );

        interviewService.nextRound(created.id());

        ArgumentCaptor<AiInvocationRequest> captor = ArgumentCaptor.forClass(AiInvocationRequest.class);
        verify(aiChatService, atLeastOnce()).callStructured(captor.capture(), any());

        AiInvocationRequest extractionRequest = captor.getAllValues().stream()
            .filter(request -> request.conversationId().contains("-extract-0"))
            .findFirst()
            .orElseThrow();

        assertThat(extractionRequest.systemPrompt())
            .contains("面试官明确提问且候选人已经回答");
        assertThat(extractionRequest.userMessage())
            .contains("只有当 INTERVIEWER 明确针对某个技术栈提出问题，并且后续 CANDIDATE 对该技术栈给出了回答")
            .contains("如果技术栈只出现在候选人的自我介绍、项目介绍、简历/JD 信息、或候选人单方面提及中，不要记录")
            .contains("如果 INTERVIEWER 只是要求“自我介绍”“介绍项目”“描述贡献”“展开讲讲经历”")
            .contains("即使候选人回答中提到了技术栈，也不要记录")
            .contains("{\"topics\":[\"Spring Boot\",\"Redis\"]}")
            .contains("CANDIDATE: 我在自我介绍中提到过 Spring Boot 和 Redis");
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

    private Object instantiatePrivateRecord(String className, Object argument) {
        try {
            Class<?> type = Class.forName(className);
            Constructor<?> constructor = type.getDeclaredConstructors()[0];
            constructor.setAccessible(true);
            return constructor.newInstance(argument);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to build private record for test", exception);
        }
    }
}
