package com.smartresume.application.controller;

import com.smartresume.application.dto.JobApplicationDtos.JobApplicationCreateRequest;
import com.smartresume.application.dto.JobApplicationDtos.JobApplicationPageResponse;
import com.smartresume.application.dto.JobApplicationDtos.JobApplicationResponse;
import com.smartresume.application.dto.JobApplicationDtos.JobApplicationUpdateRequest;
import com.smartresume.application.service.JobApplicationService;
import com.smartresume.common.api.ApiPageDefaults;
import com.smartresume.common.api.ApiResponse;
import jakarta.validation.Valid;
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
@RequestMapping("/applications")
public class JobApplicationController {

    private final JobApplicationService jobApplicationService;

    public JobApplicationController(JobApplicationService jobApplicationService) {
        this.jobApplicationService = jobApplicationService;
    }

    @GetMapping
    public ApiResponse<JobApplicationPageResponse> list(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String keyword,
        @RequestParam(defaultValue = ApiPageDefaults.DEFAULT_PAGE) int page,
        @RequestParam(defaultValue = ApiPageDefaults.DEFAULT_PAGE_SIZE) int pageSize
    ) {
        return ApiResponse.success(jobApplicationService.list(status, keyword, page, pageSize));
    }

    @PostMapping
    public ApiResponse<JobApplicationResponse> create(@Valid @RequestBody JobApplicationCreateRequest request) {
        return ApiResponse.success(jobApplicationService.create(request), "Job application created");
    }

    @GetMapping("/{id}")
    public ApiResponse<JobApplicationResponse> getById(@PathVariable String id) {
        return ApiResponse.success(jobApplicationService.getById(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<JobApplicationResponse> update(
        @PathVariable String id,
        @Valid @RequestBody JobApplicationUpdateRequest request
    ) {
        return ApiResponse.success(jobApplicationService.update(id, request), "Job application updated");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        jobApplicationService.delete(id);
        return ApiResponse.success(null, "Job application deleted");
    }
}
