package com.smartresume.interview.service;

import com.smartresume.ai.dto.AiDtos.AiChatEvent;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.interview.domain.InterviewMessageEntity;
import com.smartresume.interview.domain.InterviewSessionEntity;
import com.smartresume.interview.dto.InterviewDtos.InterviewCreateRequest;
import com.smartresume.interview.dto.InterviewDtos.InterviewDetailResponse;
import com.smartresume.interview.dto.InterviewDtos.InterviewMessageRequest;
import com.smartresume.interview.dto.InterviewDtos.InterviewPageResponse;
import com.smartresume.interview.mapper.InterviewSessionMapper;
import com.smartresume.resume.domain.ResumeEntity;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;

@Service
public class InterviewService {

    private static final Logger log = LoggerFactory.getLogger(InterviewService.class);

    private final InterviewSessionMapper interviewSessionMapper;
    private final InterviewQueryService interviewQueryService;
    private final InterviewSessionSupportService sessionSupportService;
    private final InterviewAiOrchestrationService interviewAiOrchestrationService;
    private final InterviewReportService interviewReportService;
    private final InterviewPhysicalDeleteService interviewPhysicalDeleteService;

    public InterviewService(
        InterviewSessionMapper interviewSessionMapper,
        InterviewQueryService interviewQueryService,
        InterviewSessionSupportService sessionSupportService,
        InterviewAiOrchestrationService interviewAiOrchestrationService,
        InterviewReportService interviewReportService,
        InterviewPhysicalDeleteService interviewPhysicalDeleteService
    ) {
        this.interviewSessionMapper = interviewSessionMapper;
        this.interviewQueryService = interviewQueryService;
        this.sessionSupportService = sessionSupportService;
        this.interviewAiOrchestrationService = interviewAiOrchestrationService;
        this.interviewReportService = interviewReportService;
        this.interviewPhysicalDeleteService = interviewPhysicalDeleteService;
    }

    public InterviewPageResponse listInterviews(String resumeId, String status, String targetCompany, String keyword, int page, int pageSize) {
        return interviewQueryService.listInterviews(resumeId, status, targetCompany, keyword, page, pageSize);
    }

    @Transactional
    public InterviewDetailResponse createInterview(InterviewCreateRequest request) {
        long userId = CurrentUserContext.requireUserId();
        String resumeId = normalizeOptionalText(request.resumeId());
        String jobDescription = normalizeOptionalText(request.jobDescription());
        String targetCompany = normalizeOptionalText(request.targetCompany());
        if (resumeId == null && jobDescription == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "简历和 JD 至少填写一个");
        }

        ResumeEntity resume = resumeId != null ? sessionSupportService.requireActiveResume(resumeId, userId) : null;
        LocalDateTime now = LocalDateTime.now();

        InterviewSessionEntity session = new InterviewSessionEntity();
        session.setId(UUID.randomUUID().toString());
        session.setUserId(userId);
        session.setResumeId(resume != null ? resume.getId() : null);
        session.setTitle(request.title().trim());
        session.setAiConversationId("interview-" + session.getId());
        session.setJobDescription(jobDescription);
        session.setTargetCompany(targetCompany);
        session.setDifficulty(normalizeDifficulty(request.difficulty()));
        session.setInterviewerRolesJson(sessionSupportService.toJson(normalizeInterviewerRoles(request.interviewerRoles())));
        session.setCompanyContextSummaryJson(sessionSupportService.toJson(List.of()));
        session.setCompanyContextStatus(
            targetCompany == null ? InterviewConstants.COMPANY_CONTEXT_NOT_REQUESTED : InterviewConstants.COMPANY_CONTEXT_FAILED
        );
        session.setActiveRoundIndex(0);
        session.setStatus(InterviewConstants.STATUS_IN_PROGRESS);
        session.setReportStatus(InterviewConstants.REPORT_PENDING);
        session.setTotalElapsedSeconds(0);
        session.setLastResumedAt(now);
        session.setCreatedAt(now);
        session.setUpdatedAt(now);

        if (targetCompany != null) {
            List<String> companyContextSummary = interviewAiOrchestrationService.extractCompanyContextSummary(
                targetCompany,
                session,
                resume
            );
            session.setCompanyContextSummaryJson(sessionSupportService.toJson(companyContextSummary));
            session.setCompanyContextStatus(
                companyContextSummary.isEmpty()
                    ? InterviewConstants.COMPANY_CONTEXT_FAILED
                    : InterviewConstants.COMPANY_CONTEXT_READY
            );
        }

        interviewSessionMapper.insert(session);

        String openingMessage = interviewAiOrchestrationService.generateAiResponse(
            session,
            resume,
            "请开始第一轮面试，先做简短自我介绍然后提出第一个面试问题。",
            0
        );
        sessionSupportService.appendMessage(session, "INTERVIEWER", openingMessage, 1, now);
        return getInterview(session.getId());
    }

    public InterviewDetailResponse getInterview(String interviewId) {
        return interviewQueryService.getInterview(interviewId);
    }

    @Transactional
    public void deleteInterview(String interviewId) {
        interviewPhysicalDeleteService.deleteOwnedInterview(interviewId, CurrentUserContext.requireUserId());
    }

    @Transactional
    public InterviewDetailResponse pauseInterview(String interviewId) {
        InterviewSessionEntity session = sessionSupportService.requireSession(interviewId);
        sessionSupportService.requireStatus(
            session,
            InterviewConstants.STATUS_IN_PROGRESS,
            "Only in-progress interviews can be paused"
        );
        LocalDateTime now = LocalDateTime.now();
        sessionSupportService.accumulateElapsedTime(session, now);
        session.setStatus(InterviewConstants.STATUS_PAUSED);
        session.setUpdatedAt(now);
        sessionSupportService.updateSessionWithNulls(session);
        return getInterview(session.getId());
    }

    @Transactional
    public InterviewDetailResponse continueInterview(String interviewId) {
        InterviewSessionEntity session = sessionSupportService.requireSession(interviewId);
        sessionSupportService.requireStatus(
            session,
            InterviewConstants.STATUS_PAUSED,
            "Only paused interviews can be continued"
        );
        LocalDateTime now = LocalDateTime.now();
        session.setStatus(InterviewConstants.STATUS_IN_PROGRESS);
        session.setLastResumedAt(now);
        session.setUpdatedAt(now);
        interviewSessionMapper.update(session);
        return getInterview(session.getId());
    }

    @Transactional
    public InterviewDetailResponse nextRound(String interviewId) {
        InterviewSessionEntity session = sessionSupportService.requireSession(interviewId);
        sessionSupportService.requireStatus(
            session,
            InterviewConstants.STATUS_IN_PROGRESS,
            "Only in-progress interviews can advance rounds"
        );

        List<String> roles = sessionSupportService.readInterviewerRoles(session);
        int currentIndex = sessionSupportService.currentRoundIndex(session);
        if (currentIndex >= roles.size() - 1) {
            throw new AppException(HttpStatus.CONFLICT, "Interview is already at the final interviewer round");
        }

        LocalDateTime now = LocalDateTime.now();
        List<InterviewMessageEntity> currentMessages = sessionSupportService.listMessageEntities(session.getId(), session.getUserId());
        int nextOrder = nextSortOrder(currentMessages);

        session.setActiveRoundIndex(currentIndex + 1);
        session.setUpdatedAt(now);
        interviewSessionMapper.update(session);

        try {
            List<String> topics = interviewAiOrchestrationService.extractRoundTopics(session, currentIndex);
            sessionSupportService.saveRoundTopics(session, currentIndex, topics);
        } catch (Exception exception) {
            log.warn(
                "Failed to extract tech topics for session {} round {}: {}",
                session.getId(),
                currentIndex,
                exception.getMessage()
            );
        }

        ResumeEntity resume = session.getResumeId() != null
            ? sessionSupportService.requireActiveResume(session.getResumeId(), session.getUserId())
            : null;
        List<String> previousRoundTopics = sessionSupportService.getPreviousRoundTopicsBestEffort(
            session.getId(),
            session.getUserId(),
            currentIndex + 1
        );
        String roundOpeningMessage = interviewAiOrchestrationService.generateAiResponse(
            session,
            resume,
            "你是新一轮的面试官，请做简短自我介绍并提出第一个面试问题。",
            0,
            previousRoundTopics
        );
        sessionSupportService.appendMessage(session, "INTERVIEWER", roundOpeningMessage, nextOrder, now.plusNanos(1));
        return getInterview(session.getId());
    }

    @Transactional
    public InterviewDetailResponse submitMessage(String interviewId, InterviewMessageRequest request) {
        InterviewSessionEntity session = sessionSupportService.requireSession(interviewId);
        sessionSupportService.requireStatus(
            session,
            InterviewConstants.STATUS_IN_PROGRESS,
            "Only in-progress interviews accept new messages"
        );

        List<InterviewMessageEntity> currentMessages = sessionSupportService.listMessageEntities(session.getId(), session.getUserId());
        int nextOrder = nextSortOrder(currentMessages);
        LocalDateTime now = LocalDateTime.now();
        String candidateMessage = request.content().trim();

        sessionSupportService.appendMessage(session, "CANDIDATE", candidateMessage, nextOrder, now);

        int questionCount = countQuestionsInCurrentRound(currentMessages, session.getActiveRoundIndex());
        ResumeEntity resume = session.getResumeId() != null
            ? sessionSupportService.requireActiveResume(session.getResumeId(), session.getUserId())
            : null;
        String aiResponse = interviewAiOrchestrationService.generateAiResponse(
            session,
            resume,
            candidateMessage,
            questionCount
        );
        sessionSupportService.appendMessage(session, "INTERVIEWER", aiResponse, nextOrder + 1, now.plusNanos(1));

        session.setUpdatedAt(now);
        interviewSessionMapper.update(session);
        return getInterview(session.getId());
    }

    public Flux<AiChatEvent> streamMessage(String interviewId, InterviewMessageRequest request) {
        InterviewSessionEntity session = sessionSupportService.requireSession(interviewId);
        sessionSupportService.requireStatus(
            session,
            InterviewConstants.STATUS_IN_PROGRESS,
            "Only in-progress interviews accept new messages"
        );

        List<InterviewMessageEntity> currentMessages = sessionSupportService.listMessageEntities(session.getId(), session.getUserId());
        int nextOrder = nextSortOrder(currentMessages);
        LocalDateTime now = LocalDateTime.now();
        String candidateMessage = request.content().trim();

        sessionSupportService.persistMessage(session, "CANDIDATE", candidateMessage, nextOrder, now);

        int questionCount = countQuestionsInCurrentRound(currentMessages, session.getActiveRoundIndex());
        ResumeEntity resume = session.getResumeId() != null
            ? sessionSupportService.requireActiveResume(session.getResumeId(), session.getUserId())
            : null;
        List<String> previousRoundTopics = sessionSupportService.getPreviousRoundTopicsBestEffort(
            session.getId(),
            session.getUserId(),
            sessionSupportService.currentRoundIndex(session)
        );

        StringBuilder assistantText = new StringBuilder();
        boolean[] completed = { false };

        return interviewAiOrchestrationService.streamInterviewResponse(
            session,
            resume,
            candidateMessage,
            questionCount,
            previousRoundTopics
        )
            .doOnNext(event -> {
                if ("message".equals(event.type())) {
                    assistantText.append(event.content());
                }
            })
            .doOnComplete(() -> persistStreamMessage(session, nextOrder + 1, assistantText, completed, "NORMAL"))
            .doOnCancel(() -> persistStreamMessage(session, nextOrder + 1, assistantText, completed, "ABORTED"))
            .doOnError(error -> {
                if (completed[0]) {
                    return;
                }
                completed[0] = true;
                log.error("Stream error for interview {}: {}", session.getId(), error.getMessage());
                if (!assistantText.isEmpty()) {
                    sessionSupportService.persistMessageWithStatus(
                        session,
                        "INTERVIEWER",
                        assistantText.toString(),
                        nextOrder + 1,
                        LocalDateTime.now(),
                        "ABORTED"
                    );
                    session.setUpdatedAt(LocalDateTime.now());
                    interviewSessionMapper.update(session);
                }
            });
    }

    public Flux<AiChatEvent> regenerateStreamMessage(String interviewId) {
        InterviewSessionEntity session = sessionSupportService.requireSession(interviewId);
        sessionSupportService.requireStatus(
            session,
            InterviewConstants.STATUS_IN_PROGRESS,
            "Only in-progress interviews can regenerate messages"
        );

        List<InterviewMessageEntity> currentMessages = sessionSupportService.listMessageEntities(session.getId(), session.getUserId());
        InterviewMessageEntity lastCandidate = findLastCandidateMessage(currentMessages);
        if (lastCandidate == null) {
            throw new AppException(HttpStatus.CONFLICT, "No candidate message to regenerate from");
        }

        int nextOrder = nextSortOrder(currentMessages);
        int questionCount = countQuestionsInCurrentRound(currentMessages, session.getActiveRoundIndex());
        ResumeEntity resume = session.getResumeId() != null
            ? sessionSupportService.requireActiveResume(session.getResumeId(), session.getUserId())
            : null;
        List<String> previousRoundTopics = sessionSupportService.getPreviousRoundTopicsBestEffort(
            session.getId(),
            session.getUserId(),
            sessionSupportService.currentRoundIndex(session)
        );

        StringBuilder assistantText = new StringBuilder();
        boolean[] completed = { false };

        return interviewAiOrchestrationService.streamInterviewResponse(
            session,
            resume,
            lastCandidate.getContent(),
            questionCount,
            previousRoundTopics
        )
            .doOnNext(event -> {
                if ("message".equals(event.type())) {
                    assistantText.append(event.content());
                }
            })
            .doOnComplete(() -> persistStreamMessage(session, nextOrder, assistantText, completed, "NORMAL"))
            .doOnCancel(() -> persistStreamMessage(session, nextOrder, assistantText, completed, "ABORTED"))
            .doOnError(error -> {
                if (completed[0]) {
                    return;
                }
                completed[0] = true;
                log.error("Regenerate stream error for interview {}: {}", session.getId(), error.getMessage());
                if (!assistantText.isEmpty()) {
                    sessionSupportService.persistMessageWithStatus(
                        session,
                        "INTERVIEWER",
                        assistantText.toString(),
                        nextOrder,
                        LocalDateTime.now(),
                        "ABORTED"
                    );
                    session.setUpdatedAt(LocalDateTime.now());
                    interviewSessionMapper.update(session);
                }
            });
    }

    @Transactional
    public InterviewDetailResponse endInterview(String interviewId) {
        InterviewSessionEntity session = sessionSupportService.requireSession(interviewId);
        if (InterviewConstants.STATUS_ENDED.equals(session.getStatus())) {
            return getInterview(session.getId());
        }
        if (!InterviewConstants.STATUS_IN_PROGRESS.equals(session.getStatus())
            && !InterviewConstants.STATUS_PAUSED.equals(session.getStatus())) {
            throw new AppException(HttpStatus.CONFLICT, "Interview cannot be ended");
        }

        LocalDateTime now = LocalDateTime.now();
        sessionSupportService.accumulateElapsedTime(session, now);
        session.setStatus(InterviewConstants.STATUS_ENDED);
        session.setReportStatus(InterviewConstants.REPORT_PENDING);
        session.setEndedAt(now);
        session.setUpdatedAt(now);
        sessionSupportService.updateSessionWithNulls(session);

        interviewReportService.generateReportAsync(session.getId(), session.getUserId());
        return getInterview(session.getId());
    }

    private int countQuestionsInCurrentRound(List<InterviewMessageEntity> allMessages, Integer activeRoundIndex) {
        int roundIndex = activeRoundIndex == null ? 0 : activeRoundIndex;
        return (int) allMessages.stream()
            .filter(message -> "INTERVIEWER".equals(message.getRole()))
            .filter(message -> Objects.equals(message.getRoundIndex(), roundIndex))
            .count();
    }

    private int nextSortOrder(List<InterviewMessageEntity> currentMessages) {
        return currentMessages.stream()
            .map(InterviewMessageEntity::getSortOrder)
            .filter(Objects::nonNull)
            .max(Integer::compareTo)
            .orElse(0) + 1;
    }

    private InterviewMessageEntity findLastCandidateMessage(List<InterviewMessageEntity> currentMessages) {
        for (int index = currentMessages.size() - 1; index >= 0; index--) {
            InterviewMessageEntity currentMessage = currentMessages.get(index);
            if ("CANDIDATE".equals(currentMessage.getRole())) {
                return currentMessage;
            }
        }
        return null;
    }

    private void persistStreamMessage(
        InterviewSessionEntity session,
        int sortOrder,
        StringBuilder assistantText,
        boolean[] completed,
        String status
    ) {
        if (completed[0]) {
            return;
        }
        completed[0] = true;
        if (assistantText.isEmpty()) {
            return;
        }
        if ("NORMAL".equals(status)) {
            sessionSupportService.persistMessage(
                session,
                "INTERVIEWER",
                assistantText.toString(),
                sortOrder,
                LocalDateTime.now()
            );
        } else {
            sessionSupportService.persistMessageWithStatus(
                session,
                "INTERVIEWER",
                assistantText.toString(),
                sortOrder,
                LocalDateTime.now(),
                status
            );
        }
        session.setUpdatedAt(LocalDateTime.now());
        interviewSessionMapper.update(session);
    }

    private String normalizeDifficulty(String difficulty) {
        String normalized = difficulty.trim().toUpperCase(Locale.ROOT);
        if (!InterviewConstants.DIFFICULTIES.contains(normalized)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Interview difficulty must be EASY, MEDIUM, or HARD");
        }
        return normalized;
    }

    private List<String> normalizeInterviewerRoles(List<String> interviewerRoles) {
        List<String> roles = interviewerRoles == null ? List.of() : interviewerRoles.stream()
            .map(this::normalizeOptionalText)
            .filter(Objects::nonNull)
            .toList();
        if (roles.isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "At least one interviewer role is required");
        }
        return List.copyOf(roles);
    }

    private String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
