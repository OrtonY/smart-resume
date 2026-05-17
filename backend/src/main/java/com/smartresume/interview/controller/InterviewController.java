package com.smartresume.interview.controller;

import com.smartresume.common.api.ApiResponse;
import com.smartresume.interview.dto.InterviewDtos.InterviewCreateRequest;
import com.smartresume.interview.dto.InterviewDtos.InterviewDetailResponse;
import com.smartresume.interview.dto.InterviewDtos.InterviewMessageRequest;
import com.smartresume.interview.dto.InterviewDtos.InterviewPageResponse;
import com.smartresume.interview.service.InterviewService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/interviews")
public class InterviewController {

    private final InterviewService interviewService;

    public InterviewController(InterviewService interviewService) {
        this.interviewService = interviewService;
    }

    @GetMapping
    public ApiResponse<InterviewPageResponse> listInterviews(
        @RequestParam(required = false) String resumeId,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String keyword,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "6") int pageSize
    ) {
        return ApiResponse.success(interviewService.listInterviews(resumeId, status, keyword, page, pageSize));
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

    @PostMapping("/{interviewId}/end")
    public ApiResponse<InterviewDetailResponse> endInterview(@PathVariable String interviewId) {
        return ApiResponse.success(interviewService.endInterview(interviewId), "Interview ended");
    }
}
