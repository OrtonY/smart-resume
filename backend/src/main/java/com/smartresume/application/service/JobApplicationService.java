package com.smartresume.application.service;

import static com.mybatisflex.core.query.QueryMethods.lower;

import com.mybatisflex.core.paginate.Page;
import com.mybatisflex.core.query.QueryCondition;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.application.domain.JobApplicationEntity;
import com.smartresume.application.domain.table.JobApplicationEntityTableDef;
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
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JobApplicationService {

    private static final Set<String> VALID_STATUSES = Set.of(
        "applied", "interviewing", "offered", "rejected", "withdrawn"
    );

    private final JobApplicationMapper jobApplicationMapper;
    private final ResumeMapper resumeMapper;

    public JobApplicationService(JobApplicationMapper jobApplicationMapper, ResumeMapper resumeMapper) {
        this.jobApplicationMapper = jobApplicationMapper;
        this.resumeMapper = resumeMapper;
    }

    public JobApplicationPageResponse list(String status, String keyword, int page, int pageSize) {
        int safePage = Math.max(1, page);
        int safePageSize = Math.max(1, pageSize);
        long userId = CurrentUserContext.requireUserId();

        JobApplicationEntityTableDef t = JobApplicationEntityTableDef.JOB_APPLICATION_ENTITY;
        QueryWrapper query = QueryWrapper.create().where(t.USER_ID.eq(userId));

        if (status != null && !status.isBlank()) {
            String normalized = status.trim().toLowerCase(Locale.ROOT);
            if (!VALID_STATUSES.contains(normalized)) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Invalid application status");
            }
            query.and(t.STATUS.eq(normalized));
        }
        if (keyword != null && !keyword.isBlank()) {
            String pattern = keyword.trim().toLowerCase(Locale.ROOT);
            QueryCondition keywordCondition = lower(t.COMPANY).like(pattern)
                .or(lower(t.POSITION).like(pattern));
            query.and(keywordCondition);
        }
        query.orderBy(t.APPLIED_AT, false);

        Page<JobApplicationEntity> paged = jobApplicationMapper.paginate(safePage, safePageSize, query);
        List<JobApplicationResponse> items = paged.getRecords().stream()
            .map(this::toResponse)
            .toList();

        return new JobApplicationPageResponse(
            items,
            paged.getTotalRow(),
            (int) paged.getPageNumber(),
            (int) paged.getPageSize(),
            Math.max(1, (int) paged.getTotalPage())
        );
    }

    public JobApplicationResponse getById(String id) {
        JobApplicationEntity entity = requireOwned(id);
        return toResponse(entity);
    }

    @Transactional
    public JobApplicationResponse create(JobApplicationCreateRequest request) {
        long userId = CurrentUserContext.requireUserId();
        validateStatus(request.status());

        JobApplicationEntity entity = new JobApplicationEntity();
        entity.setId(UUID.randomUUID().toString());
        entity.setUserId(userId);
        entity.setCompany(request.company().trim());
        entity.setPosition(request.position().trim());
        entity.setStatus(request.status().trim().toLowerCase(Locale.ROOT));
        entity.setChannel(trimOrNull(request.channel()));
        entity.setResumeId(validateOwnedResumeId(request.resumeId(), userId));
        entity.setAppliedAt(request.appliedAt() != null ? request.appliedAt() : LocalDateTime.now());
        entity.setNotes(trimOrNull(request.notes()));

        LocalDateTime now = LocalDateTime.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);

        jobApplicationMapper.insert(entity);
        return toResponse(entity);
    }

    @Transactional
    public JobApplicationResponse update(String id, JobApplicationUpdateRequest request) {
        JobApplicationEntity entity = requireOwned(id);
        validateStatus(request.status());

        entity.setCompany(request.company().trim());
        entity.setPosition(request.position().trim());
        entity.setStatus(request.status().trim().toLowerCase(Locale.ROOT));
        entity.setChannel(trimOrNull(request.channel()));
        entity.setResumeId(validateOwnedResumeId(request.resumeId(), entity.getUserId()));
        entity.setAppliedAt(request.appliedAt() != null ? request.appliedAt() : entity.getAppliedAt());
        entity.setNotes(trimOrNull(request.notes()));
        entity.setUpdatedAt(LocalDateTime.now());

        jobApplicationMapper.update(entity);
        return toResponse(entity);
    }

    @Transactional
    public void delete(String id) {
        JobApplicationEntity entity = requireOwned(id);
        jobApplicationMapper.deleteById(entity.getId());
    }

    private JobApplicationEntity requireOwned(String id) {
        long userId = CurrentUserContext.requireUserId();
        JobApplicationEntity entity = jobApplicationMapper.selectOneById(id);
        if (entity == null || userId != entity.getUserId()) {
            throw new AppException(HttpStatus.NOT_FOUND, "Job application not found");
        }
        return entity;
    }

    private void validateStatus(String status) {
        if (status == null || !VALID_STATUSES.contains(status.trim().toLowerCase(Locale.ROOT))) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Invalid application status");
        }
    }

    private JobApplicationResponse toResponse(JobApplicationEntity entity) {
        String resumeTitle = null;
        if (entity.getResumeId() != null) {
            ResumeEntity resume = resumeMapper.selectOneById(entity.getResumeId());
            if (resume != null && Long.valueOf(entity.getUserId()).equals(resume.getUserId())) {
                resumeTitle = resume.getTitle();
            }
        }
        return new JobApplicationResponse(
            entity.getId(),
            entity.getCompany(),
            entity.getPosition(),
            entity.getStatus(),
            entity.getChannel(),
            entity.getResumeId(),
            resumeTitle,
            entity.getAppliedAt(),
            entity.getNotes(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private String trimOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String validateOwnedResumeId(String resumeId, long userId) {
        String normalized = trimOrNull(resumeId);
        if (normalized == null) {
            return null;
        }
        ResumeEntity resume = resumeMapper.selectOneById(normalized);
        if (resume == null || !Long.valueOf(userId).equals(resume.getUserId())) {
            throw new AppException(HttpStatus.NOT_FOUND, "Resume not found");
        }
        return normalized;
    }
}
