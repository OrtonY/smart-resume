package com.smartresume.share.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

public final class ShareDtos {

    private ShareDtos() {
    }

    public record CreateShareRequest(
        @NotBlank(message = "{validation.share.titleRequired}")
        @Size(max = 50, message = "{validation.share.titleMaxLength}")
        String title,
        @NotBlank(message = "{validation.share.modeRequired}") String mode,
        String password
    ) {
    }

    public record VerifySharePasswordRequest(
        @NotBlank(message = "{validation.share.passwordRequired}") String password
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
