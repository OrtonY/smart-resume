package com.smartresume.system.controller;

import com.smartresume.common.api.ApiResponse;
import com.smartresume.system.dto.SystemAccessDtos.AccessTokenResponse;
import com.smartresume.system.dto.SystemAccessDtos.BootstrapStatusResponse;
import com.smartresume.system.dto.SystemAccessDtos.SetupPasswordRequest;
import com.smartresume.system.dto.SystemAccessDtos.VerifyPasswordRequest;
import com.smartresume.system.service.SystemAccessService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/system")
public class SystemAccessController {

    private final SystemAccessService systemAccessService;

    public SystemAccessController(SystemAccessService systemAccessService) {
        this.systemAccessService = systemAccessService;
    }

    @GetMapping("/bootstrap")
    public ApiResponse<BootstrapStatusResponse> getBootstrapStatus() {
        return ApiResponse.success(systemAccessService.getBootstrapStatus());
    }

    @PostMapping("/password/setup")
    public ApiResponse<AccessTokenResponse> setupPassword(@Valid @RequestBody SetupPasswordRequest request) {
        return ApiResponse.success(systemAccessService.setupPassword(request.password()), "Password configured");
    }

    @PostMapping("/password/verify")
    public ApiResponse<AccessTokenResponse> verifyPassword(@Valid @RequestBody VerifyPasswordRequest request) {
        return ApiResponse.success(systemAccessService.verifyPassword(request.password()), "Access granted");
    }
}
