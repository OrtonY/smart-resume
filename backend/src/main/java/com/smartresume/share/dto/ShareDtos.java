package com.smartresume.share.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

public final class ShareDtos {

    private ShareDtos() {
    }

    public record CreateShareRequest(@NotBlank(message = "Share mode is required") String mode) {
    }

    public record ShareLinkResponse(
        String shareCode,
        String shareMode,
        String sharePath,
        String targetVersionId,
        LocalDateTime createdAt
    ) {
    }
}
