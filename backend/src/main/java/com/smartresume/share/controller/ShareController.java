package com.smartresume.share.controller;

import com.smartresume.common.api.ApiResponse;
import com.smartresume.resume.dto.ResumeDtos.ResumeDetailResponse;
import com.smartresume.share.dto.ShareDtos.CreateShareRequest;
import com.smartresume.share.dto.ShareDtos.ShareAccessLogsPage;
import com.smartresume.share.dto.ShareDtos.ShareLinkResponse;
import com.smartresume.share.dto.ShareDtos.ShareTokenResponse;
import com.smartresume.share.dto.ShareDtos.VerifySharePasswordRequest;
import com.smartresume.share.service.ShareService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ShareController {

    private static final String SHARE_TOKEN_HEADER = "X-Share-Token";

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

    @GetMapping("/api/resumes/{resumeId}/shares/{shareCode}/access-logs")
    public ApiResponse<ShareAccessLogsPage> getAccessLogs(@PathVariable String resumeId, @PathVariable String shareCode) {
        return ApiResponse.success(shareService.getAccessLogs(resumeId, shareCode));
    }

    @PutMapping("/api/resumes/{resumeId}/shares/{shareCode}/toggle")
    public ApiResponse<Void> toggleShare(@PathVariable String resumeId, @PathVariable String shareCode) {
        shareService.deactivateShare(resumeId, shareCode);
        return ApiResponse.success(null, "Share link toggled");
    }

    @DeleteMapping("/api/resumes/{resumeId}/shares/{shareCode}")
    public ApiResponse<Void> deleteShare(@PathVariable String resumeId, @PathVariable String shareCode) {
        shareService.deleteShare(resumeId, shareCode);
        return ApiResponse.success(null, "Share link deleted");
    }

    @GetMapping("/api/public/shares/{shareCode}")
    public ApiResponse<ResumeDetailResponse> getPublicShare(
            @PathVariable String shareCode,
            @RequestHeader(value = SHARE_TOKEN_HEADER, required = false) String shareToken,
            HttpServletRequest request) {
        String ipAddress = extractIpAddress(request);
        return ApiResponse.success(shareService.getPublicShare(shareCode, shareToken, ipAddress));
    }

    @PostMapping("/api/public/shares/{shareCode}/verify")
    public ApiResponse<ShareTokenResponse> verifySharePassword(
            @PathVariable String shareCode,
            @Valid @RequestBody VerifySharePasswordRequest request) {
        return ApiResponse.success(shareService.verifyPassword(shareCode, request.password()), "Password verified");
    }

    private String extractIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp.trim();
        }
        return request.getRemoteAddr();
    }
}
