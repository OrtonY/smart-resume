package com.smartresume.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mybatisflex.core.paginate.Page;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.application.domain.JobApplicationEntity;
import com.smartresume.application.dto.JobApplicationDtos.JobApplicationCreateRequest;
import com.smartresume.application.dto.JobApplicationDtos.JobApplicationPageResponse;
import com.smartresume.application.dto.JobApplicationDtos.JobApplicationResponse;
import com.smartresume.application.dto.JobApplicationDtos.JobApplicationUpdateRequest;
import com.smartresume.application.mapper.JobApplicationMapper;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.resume.domain.ResumeEntity;
import com.smartresume.resume.mapper.ResumeMapper;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class JobApplicationServiceTest {

    private static final long USER_ID = 1L;
    private static final long OTHER_USER_ID = 2L;

    @Mock
    private JobApplicationMapper jobApplicationMapper;

    @Mock
    private ResumeMapper resumeMapper;

    private JobApplicationService service;

    @BeforeEach
    void setUp() {
        CurrentUserContext.set(new CurrentUserContext.AuthenticatedUser(USER_ID, "testuser", false));
        service = new JobApplicationService(jobApplicationMapper, resumeMapper);
    }

    @AfterEach
    void tearDown() {
        CurrentUserContext.clear();
    }

    @Test
    void createPersistsNormalizedFieldsAndAssignsCurrentUser() {
        when(resumeMapper.selectOneById("resume-1")).thenReturn(resume("resume-1", USER_ID, "Frontend Resume"));
        JobApplicationCreateRequest request = new JobApplicationCreateRequest(
            "  ByteDance  ",
            "  Frontend Engineer  ",
            "  APPLIED  ",
            "  LinkedIn  ",
            "  resume-1  ",
            LocalDateTime.of(2026, 5, 1, 10, 0),
            "  great fit  "
        );

        JobApplicationResponse response = service.create(request);

        ArgumentCaptor<JobApplicationEntity> captor = ArgumentCaptor.forClass(JobApplicationEntity.class);
        verify(jobApplicationMapper).insert(captor.capture());

        JobApplicationEntity saved = captor.getValue();
        assertThat(saved.getId()).isNotBlank();
        assertThat(saved.getUserId()).isEqualTo(USER_ID);
        assertThat(saved.getCompany()).isEqualTo("ByteDance");
        assertThat(saved.getPosition()).isEqualTo("Frontend Engineer");
        assertThat(saved.getStatus()).isEqualTo("applied");
        assertThat(saved.getChannel()).isEqualTo("LinkedIn");
        assertThat(saved.getResumeId()).isEqualTo("resume-1");
        assertThat(saved.getNotes()).isEqualTo("great fit");
        assertThat(saved.getAppliedAt()).isEqualTo(LocalDateTime.of(2026, 5, 1, 10, 0));
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();

        assertThat(response.id()).isEqualTo(saved.getId());
        assertThat(response.status()).isEqualTo("applied");
    }

    @Test
    void createDefaultsAppliedAtToNowWhenNotProvided() {
        JobApplicationCreateRequest request = new JobApplicationCreateRequest(
            "Acme",
            "Backend",
            "applied",
            null,
            null,
            null,
            null
        );
        LocalDateTime before = LocalDateTime.now().minusSeconds(1);

        service.create(request);

        ArgumentCaptor<JobApplicationEntity> captor = ArgumentCaptor.forClass(JobApplicationEntity.class);
        verify(jobApplicationMapper).insert(captor.capture());
        JobApplicationEntity saved = captor.getValue();
        assertThat(saved.getAppliedAt()).isAfterOrEqualTo(before);
        assertThat(saved.getChannel()).isNull();
        assertThat(saved.getResumeId()).isNull();
        assertThat(saved.getNotes()).isNull();
    }

    @Test
    void createRejectsInvalidStatus() {
        JobApplicationCreateRequest request = new JobApplicationCreateRequest(
            "Acme", "Backend", "bogus", null, null, null, null
        );

        assertThatThrownBy(() -> service.create(request))
            .isInstanceOfSatisfying(AppException.class, ex ->
                assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));

        verify(jobApplicationMapper, never()).insert(any());
    }

    @Test
    void createRejectsResumeOwnedByAnotherUser() {
        when(resumeMapper.selectOneById("resume-2")).thenReturn(resume("resume-2", OTHER_USER_ID, "Other Resume"));
        JobApplicationCreateRequest request = new JobApplicationCreateRequest(
            "Acme", "Backend", "applied", null, "resume-2", null, null
        );

        assertThatThrownBy(() -> service.create(request))
            .isInstanceOfSatisfying(AppException.class, ex ->
                assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(jobApplicationMapper, never()).insert(any());
    }

    @Test
    void createPopulatesResumeTitleWhenResumeFound() {
        when(resumeMapper.selectOneById("resume-1")).thenReturn(resume("resume-1", USER_ID, "Frontend Resume"));

        JobApplicationCreateRequest request = new JobApplicationCreateRequest(
            "Acme", "Backend", "applied", null, "resume-1", null, null
        );

        JobApplicationResponse response = service.create(request);

        assertThat(response.resumeId()).isEqualTo("resume-1");
        assertThat(response.resumeTitle()).isEqualTo("Frontend Resume");
    }

    @Test
    void getByIdReturnsResponseWhenOwnedByCurrentUser() {
        JobApplicationEntity entity = sampleEntity("app-1", USER_ID);
        when(jobApplicationMapper.selectOneById("app-1")).thenReturn(entity);

        JobApplicationResponse response = service.getById("app-1");

        assertThat(response.id()).isEqualTo("app-1");
        assertThat(response.company()).isEqualTo("Acme");
    }

    @Test
    void getByIdThrowsNotFoundWhenMissing() {
        when(jobApplicationMapper.selectOneById("missing")).thenReturn(null);

        assertThatThrownBy(() -> service.getById("missing"))
            .isInstanceOfSatisfying(AppException.class, ex ->
                assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void getByIdThrowsNotFoundForOtherUserRecord() {
        JobApplicationEntity entity = sampleEntity("app-1", OTHER_USER_ID);
        when(jobApplicationMapper.selectOneById("app-1")).thenReturn(entity);

        assertThatThrownBy(() -> service.getById("app-1"))
            .isInstanceOfSatisfying(AppException.class, ex ->
                assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void updateAppliesNormalizedChangesForOwnedRecord() {
        JobApplicationEntity entity = sampleEntity("app-1", USER_ID);
        when(jobApplicationMapper.selectOneById("app-1")).thenReturn(entity);
        when(resumeMapper.selectOneById("resume-1")).thenReturn(resume("resume-1", USER_ID, "Frontend Resume"));

        JobApplicationUpdateRequest request = new JobApplicationUpdateRequest(
            "  ByteDance  ",
            "  Senior FE  ",
            "INTERVIEWING",
            "Boss直聘",
            "resume-1",
            LocalDateTime.of(2026, 5, 10, 9, 0),
            "round 1"
        );

        JobApplicationResponse response = service.update("app-1", request);

        verify(jobApplicationMapper).update(entity);
        assertThat(entity.getCompany()).isEqualTo("ByteDance");
        assertThat(entity.getPosition()).isEqualTo("Senior FE");
        assertThat(entity.getStatus()).isEqualTo("interviewing");
        assertThat(entity.getChannel()).isEqualTo("Boss直聘");
        assertThat(entity.getResumeId()).isEqualTo("resume-1");
        assertThat(entity.getAppliedAt()).isEqualTo(LocalDateTime.of(2026, 5, 10, 9, 0));
        assertThat(entity.getNotes()).isEqualTo("round 1");
        assertThat(entity.getUpdatedAt()).isNotNull();
        assertThat(response.status()).isEqualTo("interviewing");
    }

    @Test
    void updateRejectsResumeOwnedByAnotherUser() {
        JobApplicationEntity entity = sampleEntity("app-1", USER_ID);
        when(jobApplicationMapper.selectOneById("app-1")).thenReturn(entity);
        when(resumeMapper.selectOneById("resume-2")).thenReturn(resume("resume-2", OTHER_USER_ID, "Other Resume"));

        JobApplicationUpdateRequest request = new JobApplicationUpdateRequest(
            "Acme", "Backend", "applied", null, "resume-2", null, null
        );

        assertThatThrownBy(() -> service.update("app-1", request))
            .isInstanceOfSatisfying(AppException.class, ex ->
                assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(jobApplicationMapper, never()).update(any(JobApplicationEntity.class));
    }

    @Test
    void updatePreservesAppliedAtWhenRequestOmitsIt() {
        JobApplicationEntity entity = sampleEntity("app-1", USER_ID);
        LocalDateTime original = entity.getAppliedAt();
        when(jobApplicationMapper.selectOneById("app-1")).thenReturn(entity);

        JobApplicationUpdateRequest request = new JobApplicationUpdateRequest(
            "Acme", "Backend", "applied", null, null, null, null
        );

        service.update("app-1", request);

        assertThat(entity.getAppliedAt()).isEqualTo(original);
    }

    @Test
    void updateRejectsInvalidStatus() {
        JobApplicationEntity entity = sampleEntity("app-1", USER_ID);
        when(jobApplicationMapper.selectOneById("app-1")).thenReturn(entity);

        JobApplicationUpdateRequest request = new JobApplicationUpdateRequest(
            "Acme", "Backend", "ghosted", null, null, null, null
        );

        assertThatThrownBy(() -> service.update("app-1", request))
            .isInstanceOfSatisfying(AppException.class, ex ->
                assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));

        verify(jobApplicationMapper, never()).update(any(JobApplicationEntity.class));
    }

    @Test
    void deletePhysicallyRemovesOwnedRecord() {
        JobApplicationEntity entity = sampleEntity("app-1", USER_ID);
        when(jobApplicationMapper.selectOneById("app-1")).thenReturn(entity);

        service.delete("app-1");

        verify(jobApplicationMapper).deleteById("app-1");
        verify(jobApplicationMapper, never()).update(any(JobApplicationEntity.class));
    }

    @Test
    void deleteThrowsForOtherUserRecord() {
        JobApplicationEntity entity = sampleEntity("app-1", OTHER_USER_ID);
        when(jobApplicationMapper.selectOneById("app-1")).thenReturn(entity);

        assertThatThrownBy(() -> service.delete("app-1"))
            .isInstanceOfSatisfying(AppException.class, ex ->
                assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        verify(jobApplicationMapper, never()).deleteById(any());
        verify(jobApplicationMapper, never()).update(any(JobApplicationEntity.class));
    }

    @Test
    void listMapsPaginatedRecordsToResponses() {
        JobApplicationEntity entity = sampleEntity("app-1", USER_ID);
        Page<JobApplicationEntity> page = new Page<>(List.of(entity), 1, 20, 1);
        when(jobApplicationMapper.paginate(eq(1), eq(20), any(QueryWrapper.class))).thenReturn(page);

        JobApplicationPageResponse response = service.list(null, null, 1, 20);

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).id()).isEqualTo("app-1");
        assertThat(response.total()).isEqualTo(1);
        assertThat(response.page()).isEqualTo(1);
        assertThat(response.pageSize()).isEqualTo(20);
        assertThat(response.totalPages()).isEqualTo(1);
    }

    @Test
    void listAcceptsValidStatusFilter() {
        Page<JobApplicationEntity> page = new Page<>(List.of(), 1, 1, 0);
        when(jobApplicationMapper.paginate(eq(1), eq(1), any(QueryWrapper.class))).thenReturn(page);

        JobApplicationPageResponse response = service.list("OFFERED", "byteDance", 0, 0);

        assertThat(response.items()).isEmpty();
        assertThat(response.page()).isEqualTo(1);
        assertThat(response.pageSize()).isEqualTo(1);
        assertThat(response.totalPages()).isEqualTo(1);
    }

    @Test
    void listRejectsInvalidStatusFilter() {
        assertThatThrownBy(() -> service.list("nope", null, 1, 20))
            .isInstanceOfSatisfying(AppException.class, ex ->
                assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));

        verify(jobApplicationMapper, never()).paginate(anyInt(), anyInt(), any(QueryWrapper.class));
    }

    private JobApplicationEntity sampleEntity(String id, long userId) {
        JobApplicationEntity entity = new JobApplicationEntity();
        entity.setId(id);
        entity.setUserId(userId);
        entity.setCompany("Acme");
        entity.setPosition("Backend");
        entity.setStatus("applied");
        entity.setChannel("LinkedIn");
        entity.setResumeId(null);
        entity.setAppliedAt(LocalDateTime.of(2026, 4, 1, 9, 0));
        entity.setNotes(null);
        entity.setCreatedAt(LocalDateTime.of(2026, 4, 1, 9, 0));
        entity.setUpdatedAt(LocalDateTime.of(2026, 4, 1, 9, 0));
        return entity;
    }

    private ResumeEntity resume(String id, long userId, String title) {
        ResumeEntity resume = new ResumeEntity();
        resume.setId(id);
        resume.setUserId(userId);
        resume.setTitle(title);
        return resume;
    }
}
