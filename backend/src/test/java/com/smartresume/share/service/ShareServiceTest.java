package com.smartresume.share.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.resume.domain.ResumeVersionEntity;
import com.smartresume.resume.service.ResumeService;
import com.smartresume.share.domain.ResumeShareEntity;
import com.smartresume.share.dto.ShareDtos.CreateShareRequest;
import com.smartresume.share.dto.ShareDtos.PublicShareAccessInfoResponse;
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
        lenient().when(shareAccessLogMapper.selectListByQuery(any(QueryWrapper.class))).thenReturn(List.of());
        shareService = new ShareService(resumeShareMapper, shareAccessLogMapper, resumeService, shareTokenService);
    }

    @AfterEach
    void clearCurrentUser() {
        CurrentUserContext.clear();
    }

    @Test
    void usesSnapshotSelectedByHashAwareResumeServiceWhenCreatingSnapshotShare() {
        ResumeVersionEntity version = new ResumeVersionEntity();
        version.setId("version-3");
        when(resumeService.captureSnapshotIfChanged("resume-1")).thenReturn(version);

        ShareLinkResponse response = shareService.createShare(
            "resume-1",
            new CreateShareRequest("Backend application", "SNAPSHOT", null)
        );

        assertThat(response.shareCode()).isNotBlank();
        verify(resumeService).validResume("resume-1");
        ArgumentCaptor<ResumeShareEntity> insertCaptor = ArgumentCaptor.forClass(ResumeShareEntity.class);
        verify(resumeShareMapper).insert(insertCaptor.capture());
        assertThat(insertCaptor.getValue().getTargetVersionId()).isEqualTo("version-3");
        assertThat(insertCaptor.getValue().getShareMode()).isEqualTo("SNAPSHOT");
        assertThat(insertCaptor.getValue().getTitle()).isEqualTo("Backend application");
    }

    @Test
    void keepsPasswordOnSnapshotShareLink() {
        ResumeVersionEntity version = new ResumeVersionEntity();
        version.setId("version-1");
        when(resumeService.captureSnapshotIfChanged("resume-1")).thenReturn(version);
        ShareLinkResponse response = shareService.createShare(
            "resume-1",
            new CreateShareRequest("Protected application", "SNAPSHOT", "abc123")
        );

        assertThat(response.shareCode()).isNotBlank();
        ArgumentCaptor<ResumeShareEntity> insertCaptor = ArgumentCaptor.forClass(ResumeShareEntity.class);
        verify(resumeShareMapper).insert(insertCaptor.capture());
        assertThat(insertCaptor.getValue().getTargetVersionId()).isEqualTo("version-1");
        assertThat(insertCaptor.getValue().getPasswordHash()).isNotBlank();
    }

    @Test
    void returnsPasswordRequirementForPublicShareAccessInfo() {
        ResumeShareEntity protectedShare = new ResumeShareEntity();
        protectedShare.setId("share-1");
        protectedShare.setShareCode("share-code");
        protectedShare.setActive(true);
        protectedShare.setPasswordHash("hashed-password");
        when(resumeShareMapper.selectListByQuery(any(QueryWrapper.class))).thenReturn(List.of(protectedShare));

        PublicShareAccessInfoResponse response = shareService.getPublicShareAccessInfo("share-code");

        assertThat(response.hasPassword()).isTrue();
    }

    @Test
    void rejectsReEnableForInvalidSnapshotShareLink() {
        ResumeShareEntity invalidShare = new ResumeShareEntity();
        invalidShare.setId("share-1");
        invalidShare.setResumeId("resume-1");
        invalidShare.setUserId(1L);
        invalidShare.setShareCode("share-code");
        invalidShare.setShareMode("SNAPSHOT");
        invalidShare.setTargetVersionId(ResumeShareEntity.INVALID_TARGET_VERSION_ID);
        invalidShare.setActive(false);
        when(resumeShareMapper.selectListByQuery(any(QueryWrapper.class))).thenReturn(List.of(invalidShare));

        assertThatThrownBy(() -> shareService.deactivateShare("resume-1", "share-code"))
            .isInstanceOf(AppException.class)
            .hasMessage("error.share.snapshotInvalid");
    }
}
