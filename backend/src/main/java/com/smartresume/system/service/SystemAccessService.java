package com.smartresume.system.service;

import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.AuthTokenService;
import com.smartresume.system.domain.SystemCredentialEntity;
import com.smartresume.system.dto.SystemAccessDtos.AccessTokenResponse;
import com.smartresume.system.dto.SystemAccessDtos.BootstrapStatusResponse;
import com.smartresume.system.mapper.SystemCredentialMapper;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SystemAccessService {

    private static final long SINGLETON_ID = 1L;

    private final SystemCredentialMapper systemCredentialMapper;
    private final AuthTokenService authTokenService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public SystemAccessService(SystemCredentialMapper systemCredentialMapper, AuthTokenService authTokenService) {
        this.systemCredentialMapper = systemCredentialMapper;
        this.authTokenService = authTokenService;
    }

    public BootstrapStatusResponse getBootstrapStatus() {
        boolean configured = findCredential().isPresent();
        return new BootstrapStatusResponse(configured, !configured);
    }

    public boolean isPasswordConfigured() {
        return findCredential().isPresent();
    }

    @Transactional
    public AccessTokenResponse setupPassword(String rawPassword) {
        if (isPasswordConfigured()) {
            throw new AppException(HttpStatus.CONFLICT, "Password has already been configured");
        }

        LocalDateTime now = LocalDateTime.now();
        SystemCredentialEntity credential = new SystemCredentialEntity();
        credential.setId(SINGLETON_ID);
        credential.setPasswordHash(passwordEncoder.encode(rawPassword));
        credential.setCreatedAt(now);
        credential.setUpdatedAt(now);
        systemCredentialMapper.insert(credential);
        return issueAccessToken(credential);
    }

    public AccessTokenResponse verifyPassword(String rawPassword) {
        SystemCredentialEntity credential = findCredential()
            .orElseThrow(() -> new AppException(HttpStatus.PRECONDITION_REQUIRED, "Password has not been configured"));

        if (!passwordEncoder.matches(rawPassword, credential.getPasswordHash())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Incorrect password");
        }
        return issueAccessToken(credential);
    }

    public void validateAccessToken(String token) {
        SystemCredentialEntity credential = findCredential()
            .orElseThrow(() -> new AppException(HttpStatus.PRECONDITION_REQUIRED, "Password has not been configured"));
        AuthTokenService.TokenPayload payload = authTokenService.verifyToken(token);
        long credentialVersion = credentialVersion(credential);
        if (payload.credentialVersion() != credentialVersion) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Access token is no longer valid");
        }
    }

    private AccessTokenResponse issueAccessToken(SystemCredentialEntity credential) {
        String token = authTokenService.createToken(credentialVersion(credential));
        return new AccessTokenResponse(token, credential.getUpdatedAt());
    }

    private Optional<SystemCredentialEntity> findCredential() {
        return systemCredentialMapper.selectAll().stream().max(Comparator.comparing(SystemCredentialEntity::getUpdatedAt));
    }

    private long credentialVersion(SystemCredentialEntity credential) {
        LocalDateTime marker = credential.getUpdatedAt() == null ? credential.getCreatedAt() : credential.getUpdatedAt();
        return marker.toEpochSecond(ZoneOffset.UTC);
    }
}
