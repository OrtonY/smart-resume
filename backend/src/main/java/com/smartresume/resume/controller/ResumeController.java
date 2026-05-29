package com.smartresume.resume.controller;

import com.smartresume.common.api.ApiPageDefaults;
import com.smartresume.common.api.ApiResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeCopyRequest;
import com.smartresume.resume.dto.ResumeDtos.ResumeCreateRequest;
import com.smartresume.resume.dto.ResumeDtos.ResumeDetailResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumePageResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeUpdateRequest;
import com.smartresume.resume.dto.ResumeDtos.ResumeVersionDetailResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeVersionSummaryResponse;
import com.smartresume.resume.service.ResumeImportService;
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
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/resumes")
public class ResumeController {

    private final ResumeService resumeService;
    private final ResumeImportService resumeImportService;

    public ResumeController(ResumeService resumeService, ResumeImportService resumeImportService) {
        this.resumeService = resumeService;
        this.resumeImportService = resumeImportService;
    }

    @GetMapping
    public ApiResponse<ResumePageResponse> listResumes(
        @RequestParam(defaultValue = "false") boolean includeDeleted,
        @RequestParam(defaultValue = "false") boolean deletedOnly,
        @RequestParam(defaultValue = ApiPageDefaults.DEFAULT_PAGE) int page,
        @RequestParam(defaultValue = ApiPageDefaults.DEFAULT_PAGE_SIZE) int pageSize
    ) {
        return ApiResponse.success(resumeService.listResumes(includeDeleted, deletedOnly, page, pageSize));
    }

    @PostMapping
    public ApiResponse<ResumeDetailResponse> createResume(@Valid @RequestBody ResumeCreateRequest request) {
        return ApiResponse.success(resumeService.createResume(request), "Resume created");
    }

    @PostMapping(value = "/import", consumes = "multipart/form-data")
    public ApiResponse<ResumeDetailResponse> importResume(
        @RequestParam("file") MultipartFile file,
        @RequestParam("templateKey") String templateKey
    ) {
        return ApiResponse.success(resumeImportService.importResume(file, templateKey), "Resume imported");
    }

    @PostMapping("/{resumeId}/copy")
    public ApiResponse<ResumeDetailResponse> copyResume(
        @PathVariable String resumeId,
        @Valid @RequestBody ResumeCopyRequest request
    ) {
        return ApiResponse.success(resumeService.copyResume(resumeId, request), "Resume copied");
    }

    @GetMapping("/{resumeId}")
    public ApiResponse<ResumeDetailResponse> getResume(@PathVariable String resumeId) {
        return ApiResponse.success(resumeService.getResume(resumeId));
    }

    @PutMapping("/{resumeId}")
    public ApiResponse<ResumeDetailResponse> updateResume(@PathVariable String resumeId, @Valid @RequestBody ResumeUpdateRequest request) {
        return ApiResponse.success(resumeService.updateResume(resumeId, request), "Resume auto-saved");
    }

    @PostMapping("/{resumeId}/versions")
    public ApiResponse<ResumeVersionSummaryResponse> createResumeVersion(@PathVariable String resumeId) {
        return ApiResponse.success(
            toVersionSummary(resumeService.captureSnapshot(resumeId)),
            "Resume snapshot created"
        );
    }

    @GetMapping("/{resumeId}/versions")
    public ApiResponse<List<ResumeVersionSummaryResponse>> listResumeVersions(@PathVariable String resumeId) {
        return ApiResponse.success(resumeService.listVersions(resumeId));
    }

    @GetMapping("/{resumeId}/versions/{versionId}")
    public ApiResponse<ResumeVersionDetailResponse> getResumeVersion(
        @PathVariable String resumeId,
        @PathVariable String versionId
    ) {
        return ApiResponse.success(resumeService.getVersionDetail(resumeId, versionId));
    }

    @PostMapping("/{resumeId}/versions/{versionId}/restore")
    public ApiResponse<ResumeDetailResponse> restoreResumeFromVersion(
        @PathVariable String resumeId,
        @PathVariable String versionId
    ) {
        return ApiResponse.success(resumeService.restoreFromVersion(resumeId, versionId), "Resume version restored");
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

    private ResumeVersionSummaryResponse toVersionSummary(com.smartresume.resume.domain.ResumeVersionEntity version) {
        return new ResumeVersionSummaryResponse(
            version.getId(),
            version.getResumeId(),
            version.getVersionNumber() == null ? 0 : version.getVersionNumber(),
            version.getTitle(),
            version.getTemplateKey(),
            version.getCreatedAt()
        );
    }
}
