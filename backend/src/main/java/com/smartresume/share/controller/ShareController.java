package com.smartresume.share.controller;

import com.smartresume.common.api.ApiResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeDetailResponse;
import com.smartresume.share.dto.ShareDtos.CreateShareRequest;
import com.smartresume.share.dto.ShareDtos.ShareLinkResponse;
import com.smartresume.share.service.ShareService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ShareController {

    private final ShareService shareService;

    public ShareController(ShareService shareService) {
        this.shareService = shareService;
    }

    @PostMapping("/api/resumes/{resumeId}/shares")
    public ApiResponse<ShareLinkResponse> createShare(@PathVariable String resumeId, @Valid @RequestBody CreateShareRequest request) {
        return ApiResponse.success(shareService.createShare(resumeId, request), "Share link created");
    }

    @GetMapping("/api/resumes/{resumeId}/shares")
    public ApiResponse<List<ShareLinkResponse>> listShares(@PathVariable String resumeId) {
        return ApiResponse.success(shareService.listShares(resumeId));
    }

    @GetMapping("/api/public/shares/{shareCode}")
    public ApiResponse<ResumeDetailResponse> getPublicShare(@PathVariable String shareCode) {
        return ApiResponse.success(shareService.getPublicShare(shareCode));
    }
}
