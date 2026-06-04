package com.smartresume.interview.service;

import static com.mybatisflex.core.query.QueryMethods.lower;

import com.mybatisflex.core.paginate.Page;
import com.mybatisflex.core.query.QueryCondition;
import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.interview.domain.InterviewSessionEntity;
import com.smartresume.interview.domain.table.InterviewSessionEntityTableDef;
import com.smartresume.interview.dto.InterviewDtos.InterviewDetailResponse;
import com.smartresume.interview.dto.InterviewDtos.InterviewPageResponse;
import com.smartresume.interview.dto.InterviewDtos.InterviewSummaryResponse;
import com.smartresume.interview.mapper.InterviewSessionMapper;
import com.smartresume.resume.domain.ResumeEntity;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class InterviewQueryService {

    private final InterviewSessionMapper interviewSessionMapper;
    private final InterviewSessionSupportService sessionSupportService;
    private final InterviewQuestionBankService questionBankService;

    public InterviewQueryService(
        InterviewSessionMapper interviewSessionMapper,
        InterviewSessionSupportService sessionSupportService,
        InterviewQuestionBankService questionBankService
    ) {
        this.interviewSessionMapper = interviewSessionMapper;
        this.sessionSupportService = sessionSupportService;
        this.questionBankService = questionBankService;
    }

    public InterviewPageResponse listInterviews(String resumeId, String status, String targetCompany, String keyword, int page, int pageSize) {
        int safePage = Math.max(1, page);
        int safePageSize = Math.max(1, pageSize);
        long userId = CurrentUserContext.requireUserId();
        String normalizedStatus = normalizeOptionalStatus(status);
        String normalizedTargetCompany = normalizeOptionalText(targetCompany);
        String normalizedKeyword = keyword == null ? "" : keyword.trim();

        InterviewSessionEntityTableDef sessionTable = InterviewSessionEntityTableDef.INTERVIEW_SESSION_ENTITY;
        QueryWrapper query = QueryWrapper.create().where(sessionTable.USER_ID.eq(userId));
        if (resumeId != null && !resumeId.isBlank()) {
            query.and(sessionTable.RESUME_ID.eq(resumeId));
        }
        if (normalizedStatus != null) {
            query.and(sessionTable.STATUS.eq(normalizedStatus));
        }
        if (normalizedTargetCompany != null) {
            query.and(lower(sessionTable.TARGET_COMPANY).like(normalizedTargetCompany.toLowerCase(Locale.ROOT)));
        }
        if (!normalizedKeyword.isBlank()) {
            String pattern = normalizedKeyword.toLowerCase(Locale.ROOT);
            QueryCondition keywordCondition = lower(sessionTable.TITLE).like(pattern)
                .or(lower(sessionTable.JOB_DESCRIPTION).like(pattern))
                .or(lower(sessionTable.TARGET_COMPANY).like(pattern));
            query.and(keywordCondition);
        }
        query.orderBy(sessionTable.UPDATED_AT, false);
        Page<InterviewSessionEntity> pagedSessions = interviewSessionMapper.paginate(safePage, safePageSize, query);

        List<InterviewSummaryResponse> items = pagedSessions.getRecords().stream()
            .map(this::toSummary)
            .toList();

        return new InterviewPageResponse(
            items,
            pagedSessions.getTotalRow(),
            (int) pagedSessions.getPageNumber(),
            (int) pagedSessions.getPageSize(),
            Math.max(1, (int) pagedSessions.getTotalPage())
        );
    }

    public InterviewDetailResponse getInterview(String interviewId) {
        InterviewSessionEntity session = sessionSupportService.requireSession(interviewId);
        return toDetail(session);
    }

    private InterviewSummaryResponse toSummary(InterviewSessionEntity session) {
        ResumeEntity resume = sessionSupportService.loadOwnedResumeForSession(session);
        String questionBankName = questionBankService.findOwnedBankName(session.getQuestionBankId(), session.getUserId());
        return new InterviewSummaryResponse(
            session.getId(),
            session.getResumeId(),
            resume == null ? null : resume.getTitle(),
            session.getAiConversationId(),
            session.getTitle(),
            session.getJobDescription(),
            session.getTargetCompany(),
            session.getQuestionBankId(),
            questionBankName,
            questionBankService.readTagsJsonBestEffort(session.getQuestionBankTagsJson()),
            normalizeQuestionBankRelevanceForResponse(session),
            session.getDifficulty(),
            sessionSupportService.readInterviewerRoles(session),
            sessionSupportService.readCompanyContextSummary(session),
            sessionSupportService.normalizeCompanyContextStatus(session.getCompanyContextStatus()),
            sessionSupportService.currentRoundIndex(session),
            session.getStatus(),
            session.getReportStatus(),
            session.getCreatedAt(),
            session.getUpdatedAt(),
            session.getEndedAt()
        );
    }

    private InterviewDetailResponse toDetail(InterviewSessionEntity session) {
        ResumeEntity resume = sessionSupportService.loadOwnedResumeForSession(session);
        long totalElapsed = session.getTotalElapsedSeconds() == null ? 0L : session.getTotalElapsedSeconds();
        String questionBankName = questionBankService.findOwnedBankName(session.getQuestionBankId(), session.getUserId());
        return new InterviewDetailResponse(
            session.getId(),
            session.getResumeId(),
            resume == null ? null : resume.getTitle(),
            session.getAiConversationId(),
            session.getTitle(),
            session.getJobDescription(),
            session.getTargetCompany(),
            session.getQuestionBankId(),
            questionBankName,
            questionBankService.readTagsJsonBestEffort(session.getQuestionBankTagsJson()),
            normalizeQuestionBankRelevanceForResponse(session),
            session.getDifficulty(),
            sessionSupportService.readInterviewerRoles(session),
            sessionSupportService.readCompanyContextSummary(session),
            sessionSupportService.normalizeCompanyContextStatus(session.getCompanyContextStatus()),
            sessionSupportService.currentRoundIndex(session),
            session.getStatus(),
            session.getReportStatus(),
            session.getReportContent(),
            sessionSupportService.listMessages(session),
            totalElapsed,
            session.getLastResumedAt(),
            session.getCreatedAt(),
            session.getUpdatedAt(),
            session.getEndedAt()
        );
    }

    private String normalizeOptionalStatus(String status) {
        String normalized = normalizeOptionalText(status);
        if (normalized == null) {
            return null;
        }
        normalized = normalized.toUpperCase(Locale.ROOT);
        if (!InterviewConstants.STATUSES.contains(normalized)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Interview status is invalid");
        }
        return normalized;
    }

    private String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalizeQuestionBankRelevanceForResponse(InterviewSessionEntity session) {
        if (session.getQuestionBankId() == null || session.getQuestionBankRelevance() == null) {
            return null;
        }
        return questionBankService.normalizeRelevanceOrDefault(session.getQuestionBankRelevance());
    }
}
