package com.smartresume.interview.controller;

import com.smartresume.ai.dto.AiDtos.AiChatEvent;
import com.smartresume.common.api.ApiResponse;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.interview.dto.InterviewDtos.InterviewCreateRequest;
import com.smartresume.interview.dto.InterviewDtos.InterviewDetailResponse;
import com.smartresume.interview.dto.InterviewDtos.InterviewMessageRequest;
import com.smartresume.interview.dto.InterviewDtos.InterviewPageResponse;
import com.smartresume.interview.service.InterviewReportService;
import com.smartresume.interview.service.InterviewService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/interviews")
public class InterviewController {

    private final InterviewService interviewService;
    private final InterviewReportService interviewReportService;

    public InterviewController(InterviewService interviewService, InterviewReportService interviewReportService) {
        this.interviewService = interviewService;
        this.interviewReportService = interviewReportService;
    }

    @GetMapping
    public ApiResponse<InterviewPageResponse> listInterviews(
        @RequestParam(required = false) String resumeId,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String targetCompany,
        @RequestParam(required = false) String keyword,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "6") int pageSize
    ) {
        return ApiResponse.success(interviewService.listInterviews(resumeId, status, targetCompany, keyword, page, pageSize));
    }

    @PostMapping
    public ApiResponse<InterviewDetailResponse> createInterview(@Valid @RequestBody InterviewCreateRequest request) {
        return ApiResponse.success(interviewService.createInterview(request), "Interview started");
    }

    @GetMapping("/{interviewId}")
    public ApiResponse<InterviewDetailResponse> getInterview(@PathVariable String interviewId) {
        return ApiResponse.success(interviewService.getInterview(interviewId));
    }

    @PostMapping("/{interviewId}/pause")
    public ApiResponse<InterviewDetailResponse> pauseInterview(@PathVariable String interviewId) {
        return ApiResponse.success(interviewService.pauseInterview(interviewId), "Interview paused");
    }

    @PostMapping("/{interviewId}/continue")
    public ApiResponse<InterviewDetailResponse> continueInterview(@PathVariable String interviewId) {
        return ApiResponse.success(interviewService.continueInterview(interviewId), "Interview continued");
    }

    @PostMapping("/{interviewId}/next-round")
    public ApiResponse<InterviewDetailResponse> nextRound(@PathVariable String interviewId) {
        return ApiResponse.success(interviewService.nextRound(interviewId), "Interview round advanced");
    }

    @PostMapping("/{interviewId}/messages")
    public ApiResponse<InterviewDetailResponse> submitMessage(
        @PathVariable String interviewId,
        @Valid @RequestBody InterviewMessageRequest request
    ) {
        return ApiResponse.success(interviewService.submitMessage(interviewId, request), "Interview message saved");
    }

    @PostMapping(value = "/{interviewId}/messages/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<AiChatEvent> streamMessage(
        @PathVariable String interviewId,
        @Valid @RequestBody InterviewMessageRequest request
    ) {
        return interviewService.streamMessage(interviewId, request);
    }

    @PostMapping(value = "/{interviewId}/messages/regenerate-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<AiChatEvent> regenerateStreamMessage(@PathVariable String interviewId) {
        return interviewService.regenerateStreamMessage(interviewId);
    }

    @PostMapping("/{interviewId}/end")
    public ApiResponse<InterviewDetailResponse> endInterview(@PathVariable String interviewId) {
        return ApiResponse.success(interviewService.endInterview(interviewId), "Interview ended");
    }

    @GetMapping(value = "/{interviewId}/report/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeReportEvents(@PathVariable String interviewId) {
        return interviewReportService.subscribe(interviewId);
    }

    @PostMapping("/{interviewId}/report/regenerate")
    public ApiResponse<Void> regenerateReport(@PathVariable String interviewId) {
        interviewReportService.generateReportAsync(interviewId, CurrentUserContext.requireUserId());
        return ApiResponse.success(null, "Report regeneration started");
    }
}
