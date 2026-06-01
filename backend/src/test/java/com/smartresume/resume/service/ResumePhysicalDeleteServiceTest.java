package com.smartresume.resume.service;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartresume.ai.mapper.AiChatMessageMapper;
import com.smartresume.ai.mapper.AiResumeScoreMapper;
import com.smartresume.ai.service.AiChatConversationCleanupService;
import com.smartresume.ai.service.AiChatMemoryArchiveService;
import com.smartresume.interview.service.InterviewPhysicalDeleteService;
import com.smartresume.resume.mapper.ResumeMapper;
import com.smartresume.resume.mapper.ResumeSectionMapper;
import com.smartresume.resume.mapper.ResumeVersionMapper;
import com.smartresume.share.mapper.ResumeShareMapper;
import com.smartresume.share.mapper.ShareAccessLogMapper;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ResumePhysicalDeleteServiceTest {

    @Mock
    private AiChatMessageMapper aiChatMessageMapper;

    @Mock
    private AiResumeScoreMapper aiResumeScoreMapper;

    @Mock
    private ResumeSectionMapper resumeSectionMapper;

    @Mock
    private ResumeVersionMapper resumeVersionMapper;

    @Mock
    private ResumeMapper resumeMapper;

    @Mock
    private ResumeShareMapper resumeShareMapper;

    @Mock
    private ShareAccessLogMapper shareAccessLogMapper;

    @Mock
    private AiChatConversationCleanupService aiChatConversationCleanupService;

    @Mock
    private AiChatMemoryArchiveService aiChatMemoryArchiveService;

    @Mock
    private InterviewPhysicalDeleteService interviewPhysicalDeleteService;

    private ResumePhysicalDeleteService resumePhysicalDeleteService;

    @BeforeEach
    void setUp() {
        resumePhysicalDeleteService = new ResumePhysicalDeleteService(
            aiChatMessageMapper,
            aiResumeScoreMapper,
            resumeSectionMapper,
            resumeVersionMapper,
            resumeMapper,
            resumeShareMapper,
            shareAccessLogMapper,
            aiChatConversationCleanupService,
            aiChatMemoryArchiveService,
            interviewPhysicalDeleteService
        );
    }

    @Test
    void purgeArchivesResumeFeatureMemoriesBeforeDeletingResumeRows() {
        List<String> memoryConversationIds = List.of(
            "resume-1_resume_score_20260529120000000",
            "resume-1_interview_report_20260529120100000"
        );
        when(aiChatMemoryArchiveService.findConversationIdsByPrefix("resume-1_"))
            .thenReturn(memoryConversationIds);

        resumePhysicalDeleteService.deleteResumeAndLinkedData("resume-1", 7L);

        verify(aiChatMemoryArchiveService).archiveAndDeleteAll(
            memoryConversationIds,
            7L,
            "resume-1",
            AiChatConversationCleanupService.REASON_RESUME_PURGE
        );
    }
}
