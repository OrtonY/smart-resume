package com.smartresume.share.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.resume.domain.ResumeVersionEntity;
import com.smartresume.resume.dto.ResumeDtos.ResumeVersionSummaryResponse;
import com.smartresume.resume.service.ResumeService;
import com.smartresume.share.domain.ResumeShareEntity;
import com.smartresume.share.dto.ShareDtos.CreateShareRequest;
import com.smartresume.share.dto.ShareDtos.ShareLinkResponse;
import com.smartresume.share.mapper.ResumeShareMapper;
import com.smartresume.share.mapper.ShareAccessLogMapper;
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
class ShareServiceTest {

    @Mock
    private ResumeShareMapper resumeShareMapper;

    @Mock
    private ShareAccessLogMapper shareAccessLogMapper;

    @Mock
    private ResumeService resumeService;

    @Mock
    private ShareTokenService shareTokenService;

    private ShareService shareService;

    @BeforeEach
    void setUp() {
        CurrentUserContext.set(new CurrentUserContext.AuthenticatedUser(1L, "admin", true));
        when(shareAccessLogMapper.selectListByQuery(any(QueryWrapper.class))).thenReturn(List.of());
        shareService = new ShareService(resumeShareMapper, shareAccessLogMapper, resumeService, shareTokenService);
    }

    @AfterEach
    void clearCurrentUser() {
        CurrentUserContext.clear();
    }

    @Test
    void usesLatestExistingSnapshotWhenCreatingSnapshotShare() {
        when(resumeService.listVersions("resume-1")).thenReturn(List.of(
            new ResumeVersionSummaryResponse(
                "version-3",
                "resume-1",
                3,
                "投递简历",
                "classic",
                LocalDateTime.now().minusHours(1)
            )
        ));

        ShareLinkResponse response = shareService.createShare(
            "resume-1",
            new CreateShareRequest("投递后端", "SNAPSHOT", null)
        );

        assertThat(response.shareCode()).isNotBlank();
        verify(resumeService).validResume("resume-1");
        ArgumentCaptor<ResumeShareEntity> insertCaptor = ArgumentCaptor.forClass(ResumeShareEntity.class);
        verify(resumeShareMapper).insert(insertCaptor.capture());
        assertThat(insertCaptor.getValue().getTargetVersionId()).isEqualTo("version-3");
        verify(resumeService, never()).captureSnapshot(any());
    }

    @Test
    void createsSnapshotOnlyWhenNoHistoricalSnapshotExists() {
        when(resumeService.listVersions("resume-1")).thenReturn(List.of());
        ResumeVersionEntity newVersion = new ResumeVersionEntity();
        newVersion.setId("version-2");
        when(resumeService.captureSnapshot("resume-1")).thenReturn(newVersion);

        ShareLinkResponse response = shareService.createShare(
            "resume-1",
            new CreateShareRequest("投递后端", "SNAPSHOT", null)
        );

        assertThat(response.shareCode()).isNotBlank();
        ArgumentCaptor<ResumeShareEntity> insertCaptor = ArgumentCaptor.forClass(ResumeShareEntity.class);
        verify(resumeShareMapper).insert(insertCaptor.capture());
        assertThat(insertCaptor.getValue().getTargetVersionId()).isEqualTo("version-2");
        assertThat(insertCaptor.getValue().getShareMode()).isEqualTo("SNAPSHOT");
        assertThat(insertCaptor.getValue().getTitle()).isEqualTo("投递后端");
    }

    @Test
    void keepsPasswordOnShareLinkWhenUsingExistingSnapshot() {
        when(resumeService.listVersions("resume-1")).thenReturn(List.of(
            new ResumeVersionSummaryResponse(
                "version-1",
                "resume-1",
                1,
                "投递简历",
                "classic",
                LocalDateTime.now().minusHours(1)
            )
        ));
        ShareLinkResponse response = shareService.createShare(
            "resume-1",
            new CreateShareRequest("带密码投递", "SNAPSHOT", "abc123")
        );

        assertThat(response.shareCode()).isNotBlank();
        ArgumentCaptor<ResumeShareEntity> insertCaptor = ArgumentCaptor.forClass(ResumeShareEntity.class);
        verify(resumeShareMapper).insert(insertCaptor.capture());
        assertThat(insertCaptor.getValue().getTargetVersionId()).isEqualTo("version-1");
        assertThat(insertCaptor.getValue().getPasswordHash()).isNotBlank();
    }
}
