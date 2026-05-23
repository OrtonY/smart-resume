package com.smartresume.system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class SystemAccessDtos {

    private SystemAccessDtos() {
    }

    public record BootstrapStatusResponse(boolean hasUsers, boolean registrationEnabled) {
    }

    public record LoginRequest(
        @NotBlank(message = "{validation.user.usernameRequired}")
        @Size(min = 3, max = 80, message = "{validation.user.usernameLength}")
        String username,
        @NotBlank(message = "{validation.user.passwordRequired}")
        String password
    ) {
    }

    public record RegisterRequest(
        @NotBlank(message = "{validation.user.usernameRequired}")
        @Size(min = 3, max = 80, message = "{validation.user.usernameLength}")
        String username,
        @NotBlank(message = "{validation.user.passwordRequired}")
        @Size(min = 6, max = 64, message = "{validation.user.passwordLength}")
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
        @NotBlank(message = "{validation.user.currentPasswordRequired}")
        String currentPassword,
        @NotBlank(message = "{validation.user.newPasswordRequired}")
        @Size(min = 6, max = 64, message = "{validation.user.newPasswordLength}")
        String newPassword
    ) {
    }
}
