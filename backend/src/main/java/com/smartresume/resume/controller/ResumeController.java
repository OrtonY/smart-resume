package com.smartresume.resume.controller;

import com.smartresume.common.api.ApiResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeCreateRequest;
import com.smartresume.resume.dto.ResumeDtos.ResumeDetailResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeSummaryResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeUpdateRequest;
import com.smartresume.resume.service.ResumeService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/resumes")
public class ResumeController {

    private final ResumeService resumeService;

    public ResumeController(ResumeService resumeService) {
        this.resumeService = resumeService;
    }

    @GetMapping
    public ApiResponse<List<ResumeSummaryResponse>> listResumes(@RequestParam(defaultValue = "false") boolean includeDeleted) {
        return ApiResponse.success(resumeService.listResumes(includeDeleted));
    }

    @PostMapping
    public ApiResponse<ResumeDetailResponse> createResume(@Valid @RequestBody ResumeCreateRequest request) {
        return ApiResponse.success(resumeService.createResume(request), "Resume created");
    }

    @GetMapping("/{resumeId}")
    public ApiResponse<ResumeDetailResponse> getResume(@PathVariable String resumeId) {
        return ApiResponse.success(resumeService.getResume(resumeId));
    }

    @PutMapping("/{resumeId}")
    public ApiResponse<ResumeDetailResponse> updateResume(@PathVariable String resumeId, @Valid @RequestBody ResumeUpdateRequest request) {
        return ApiResponse.success(resumeService.updateResume(resumeId, request), "Resume auto-saved");
    }

    @DeleteMapping("/{resumeId}")
    public ApiResponse<Void> softDeleteResume(@PathVariable String resumeId) {
        resumeService.softDeleteResume(resumeId);
        return ApiResponse.success(null, "Resume moved to recycle bin");
    }

    @PostMapping("/{resumeId}/recover")
    public ApiResponse<Void> restoreResume(@PathVariable String resumeId) {
        resumeService.restoreResume(resumeId);
        return ApiResponse.success(null, "Resume restored");
    }
}
