package com.smartresume.system.controller;

import com.smartresume.common.api.ApiResponse;
import com.smartresume.system.dto.SystemAccessDtos.AccessTokenResponse;
import com.smartresume.system.dto.SystemAccessDtos.BootstrapStatusResponse;
import com.smartresume.system.dto.SystemAccessDtos.ChangePasswordRequest;
import com.smartresume.system.dto.SystemAccessDtos.LoginRequest;
import com.smartresume.system.dto.SystemAccessDtos.RegistrationSettingsRequest;
import com.smartresume.system.dto.SystemAccessDtos.RegistrationSettingsResponse;
import com.smartresume.system.dto.SystemAccessDtos.RegisterRequest;
import com.smartresume.system.dto.SystemAccessDtos.SessionResponse;
import com.smartresume.system.service.SystemAccessService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/system")
public class SystemAccessController {

    private final SystemAccessService systemAccessService;

    public SystemAccessController(SystemAccessService systemAccessService) {
        this.systemAccessService = systemAccessService;
    }

    @GetMapping("/bootstrap")
    public ApiResponse<BootstrapStatusResponse> getBootstrapStatus() {
        return ApiResponse.success(systemAccessService.getBootstrapStatus());
    }

    @PostMapping("/login")
    public ApiResponse<AccessTokenResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success(systemAccessService.login(request.username(), request.password()), "Login successful");
    }

    @PostMapping("/register")
    public ApiResponse<AccessTokenResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.success(
            systemAccessService.register(request.username(), request.password()),
            "Registration successful"
        );
    }

    @GetMapping("/session")
    public ApiResponse<SessionResponse> getSession() {
        return ApiResponse.success(systemAccessService.getSession());
    }

    @PutMapping("/registration-settings")
    public ApiResponse<RegistrationSettingsResponse> updateRegistrationSettings(
        @Valid @RequestBody RegistrationSettingsRequest request
    ) {
        return ApiResponse.success(
            systemAccessService.updateRegistrationSettings(request.registrationEnabled()),
            "Registration settings updated"
        );
    }

    @PutMapping("/password")
    public ApiResponse<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        systemAccessService.changePassword(request.currentPassword(), request.newPassword());
        return ApiResponse.success(null, "Password updated");
    }
}
