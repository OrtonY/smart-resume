package com.smartresume.resume.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.resume.domain.ResumeEntity;
import com.smartresume.resume.domain.ResumeVersionEntity;
import com.smartresume.resume.dto.ResumeDtos.PersonalInfo;
import com.smartresume.resume.dto.ResumeDtos.ResumeContentPayload;
import com.smartresume.resume.dto.ResumeDtos.ResumeLayoutPayload;
import com.smartresume.resume.mapper.ResumeMapper;
import com.smartresume.resume.mapper.ResumeVersionMapper;
import com.smartresume.share.domain.ResumeShareEntity;
import com.smartresume.share.mapper.ResumeShareMapper;
import com.smartresume.template.service.TemplateCatalogService;
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
class ResumeVersionServiceTest {

    @Mock
    private ResumeVersionMapper resumeVersionMapper;

    @Mock
    private ResumeMapper resumeMapper;

    @Mock
    private ResumeShareMapper resumeShareMapper;

    @Mock
    private ResumeLookupService resumeLookupService;

    @Mock
    private ResumeContentService resumeContentService;

    @Mock
    private TemplateCatalogService templateCatalogService;

    private ResumeVersionService resumeVersionService;

    @BeforeEach
    void setUp() {
        CurrentUserContext.set(new CurrentUserContext.AuthenticatedUser(7L, "user", false));
        resumeVersionService = new ResumeVersionService(
            resumeVersionMapper,
            resumeMapper,
            resumeShareMapper,
            resumeLookupService,
            resumeContentService,
            templateCatalogService,
            new ObjectMapper()
        );
        lenient().when(resumeContentService.toJson(any())).thenAnswer(invocation -> new ObjectMapper().writeValueAsString(invocation.getArgument(0)));
    }

    @AfterEach
    void clearCurrentUser() {
        CurrentUserContext.clear();
    }

    @Test
    void reusesLatestSnapshotWhenHashMatches() {
        ResumeEntity resume = resume("Backend Resume", "classic");
        ResumeContentPayload content = content("Alice");
        ResumeLayoutPayload layout = layout();
        when(resumeLookupService.requireResume("resume-1", 7L)).thenReturn(resume);
        when(resumeContentService.loadContent("resume-1", 7L)).thenReturn(content);
        when(resumeContentService.readLayoutOrDefault("layout-json")).thenReturn(layout);

        when(resumeVersionMapper.selectListByQuery(any(QueryWrapper.class))).thenReturn(List.of());
        ResumeVersionEntity firstCapture = resumeVersionService.captureSnapshotIfChanged("resume-1");
        clearInvocations(resumeVersionMapper);

        ResumeVersionEntity latest = new ResumeVersionEntity();
        latest.setId("version-existing");
        latest.setResumeId("resume-1");
        latest.setUserId(7L);
        latest.setVersionNumber(2);
        latest.setContentHash(firstCapture.getContentHash());
        when(resumeVersionMapper.selectListByQuery(any(QueryWrapper.class))).thenReturn(List.of(latest));

        ResumeVersionEntity result = resumeVersionService.captureSnapshotIfChanged("resume-1");

        assertThat(result.getId()).isEqualTo("version-existing");
        verify(resumeVersionMapper, never()).insert(any());
    }

    @Test
    void createsSnapshotWhenHashDiffers() {
        ResumeEntity resume = resume("Backend Resume", "classic");
        ResumeContentPayload content = content("Alice");
        ResumeLayoutPayload layout = layout();
        when(resumeLookupService.requireResume("resume-1", 7L)).thenReturn(resume);
        when(resumeContentService.loadContent("resume-1", 7L)).thenReturn(content);
        when(resumeContentService.readLayoutOrDefault("layout-json")).thenReturn(layout);

        ResumeVersionEntity latest = new ResumeVersionEntity();
        latest.setId("version-old");
        latest.setResumeId("resume-1");
        latest.setUserId(7L);
        latest.setVersionNumber(2);
        latest.setContentHash("different");
        when(resumeVersionMapper.selectListByQuery(any(QueryWrapper.class))).thenReturn(List.of(latest));

        ResumeVersionEntity result = resumeVersionService.captureSnapshotIfChanged("resume-1");

        assertThat(result.getId()).isNotBlank();
        assertThat(result.getVersionNumber()).isEqualTo(3);
        assertThat(result.getContentHash()).isNotEqualTo("different");
        ArgumentCaptor<ResumeVersionEntity> insertCaptor = ArgumentCaptor.forClass(ResumeVersionEntity.class);
        verify(resumeVersionMapper).insert(insertCaptor.capture());
        assertThat(insertCaptor.getValue().getDeleted()).isFalse();
    }

    @Test
    void deletingSnapshotInvalidatesAssociatedShares() {
        ResumeEntity resume = resume("Backend Resume", "classic");
        when(resumeLookupService.requireResume("resume-1", 7L)).thenReturn(resume);

        ResumeVersionEntity version = new ResumeVersionEntity();
        version.setId("version-1");
        version.setResumeId("resume-1");
        version.setUserId(7L);
        when(resumeVersionMapper.selectOneById("version-1")).thenReturn(version);

        ResumeShareEntity activeShare = new ResumeShareEntity();
        activeShare.setId("share-1");
        activeShare.setResumeId("resume-1");
        activeShare.setUserId(7L);
        activeShare.setTargetVersionId("version-1");
        activeShare.setActive(true);
        activeShare.setCreatedAt(LocalDateTime.now().minusHours(1));
        when(resumeShareMapper.selectListByQuery(any(QueryWrapper.class))).thenReturn(List.of(activeShare));

        resumeVersionService.deleteVersion("resume-1", "version-1");

        assertThat(version.getDeleted()).isTrue();
        assertThat(version.getDeletedAt()).isNotNull();
        verify(resumeVersionMapper).update(version);
        assertThat(activeShare.getActive()).isFalse();
        assertThat(activeShare.getTargetVersionId()).isEqualTo(ResumeShareEntity.INVALID_TARGET_VERSION_ID);
        assertThat(activeShare.getUpdatedAt()).isNotNull();
        verify(resumeShareMapper).update(activeShare);
    }

    private ResumeEntity resume(String title, String templateKey) {
        ResumeEntity resume = new ResumeEntity();
        resume.setId("resume-1");
        resume.setUserId(7L);
        resume.setTitle(title);
        resume.setTemplateKey(templateKey);
        resume.setLayoutJson("layout-json");
        return resume;
    }

    private ResumeContentPayload content(String fullName) {
        return new ResumeContentPayload(
            new PersonalInfo(fullName, "Engineer", "", "", "", "", "", "", ""),
            "Summary",
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of()
        );
    }

    private ResumeLayoutPayload layout() {
        return new ResumeLayoutPayload(List.of("summary", "workExperience"), List.of());
    }


}
