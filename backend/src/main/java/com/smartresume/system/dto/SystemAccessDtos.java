package com.smartresume.system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class SystemAccessDtos {

    private SystemAccessDtos() {
    }

    public record BootstrapStatusResponse(boolean hasUsers, boolean registrationEnabled) {
    }

    public record LoginRequest(
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 80, message = "Username must be between 3 and 80 characters")
        String username,
        @NotBlank(message = "Password is required")
        String password
    ) {
    }

    public record RegisterRequest(
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 80, message = "Username must be between 3 and 80 characters")
        String username,
        @NotBlank(message = "Password is required")
        @Size(min = 6, max = 64, message = "Password must be between 6 and 64 characters")
        String password
    ) {
    }

    public record SessionUserResponse(long userId, String username, boolean admin) {
    }

    public record AccessTokenResponse(String accessToken, SessionUserResponse user) {
    }

    public record SessionResponse(SessionUserResponse user, boolean registrationEnabled) {
    }

    public record RegistrationSettingsRequest(boolean registrationEnabled) {
    }

    public record RegistrationSettingsResponse(boolean registrationEnabled) {
    }

    public record ChangePasswordRequest(
        @NotBlank(message = "Current password is required")
        String currentPassword,
        @NotBlank(message = "New password is required")
        @Size(min = 6, max = 64, message = "New password must be between 6 and 64 characters")
        String newPassword
    ) {
    }
}
