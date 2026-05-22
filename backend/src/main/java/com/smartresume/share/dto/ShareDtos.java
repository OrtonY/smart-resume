package com.smartresume.share.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

public final class ShareDtos {

    private ShareDtos() {
    }

    public record CreateShareRequest(
        @NotBlank(message = "Share title is required")
        @Size(max = 50, message = "Share title must be at most 50 characters")
        String title,
        @NotBlank(message = "Share mode is required") String mode,
        String password
    ) {
    }

    public record VerifySharePasswordRequest(
        @NotBlank(message = "Password is required") String password
    ) {
    }

    public record ShareLinkResponse(
        String title,
        String shareCode,
        String shareMode,
        String sharePath,
        String targetVersionId,
        boolean hasPassword,
        boolean active,
        long viewCount,
        LocalDateTime lastAccessedAt,
        LocalDateTime createdAt
    ) {
    }

    public record ShareTokenResponse(String token) {
    }

    public record ShareAccessLogResponse(
        String id,
        LocalDateTime accessedAt,
        String ipAddress
    ) {
    }

    public record ShareAccessLogsPage(
        List<ShareAccessLogResponse> logs,
        long total
    ) {
    }
}
