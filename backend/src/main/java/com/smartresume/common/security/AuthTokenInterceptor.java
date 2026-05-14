package com.smartresume.common.security;

import com.smartresume.system.service.SystemAccessService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthTokenInterceptor implements HandlerInterceptor {

    public static final String ACCESS_TOKEN_HEADER = "X-Access-Token";

    private final SystemAccessService systemAccessService;

    public AuthTokenInterceptor(SystemAccessService systemAccessService) {
        this.systemAccessService = systemAccessService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String token = request.getHeader(ACCESS_TOKEN_HEADER);
        systemAccessService.validateAccessToken(token);
        return true;
    }
}
