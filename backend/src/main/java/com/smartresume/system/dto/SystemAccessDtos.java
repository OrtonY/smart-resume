package com.smartresume.system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public final class SystemAccessDtos {

    private SystemAccessDtos() {
    }

    public record BootstrapStatusResponse(boolean passwordConfigured, boolean firstTimeSetupRequired) {
    }

    public record SetupPasswordRequest(
        @NotBlank(message = "Password is required")
        @Size(min = 6, max = 64, message = "Password must be between 6 and 64 characters")
        String password
    ) {
    }

    public record VerifyPasswordRequest(
        @NotBlank(message = "Password is required")
        String password
    ) {
    }

    public record AccessTokenResponse(String accessToken, LocalDateTime credentialUpdatedAt) {
    }
}
