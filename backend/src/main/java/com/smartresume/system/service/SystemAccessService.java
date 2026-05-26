package com.smartresume.system.service;

import com.mybatisflex.core.query.QueryWrapper;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.AuthTokenService;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.system.domain.SystemSettingEntity;
import com.smartresume.system.domain.UserEntity;
import com.smartresume.system.domain.table.UserEntityTableDef;
import com.smartresume.system.dto.SystemAccessDtos.AccessTokenResponse;
import com.smartresume.system.dto.SystemAccessDtos.BootstrapStatusResponse;
import com.smartresume.system.dto.SystemAccessDtos.RegistrationSettingsResponse;
import com.smartresume.system.dto.SystemAccessDtos.SessionResponse;
import com.smartresume.system.dto.SystemAccessDtos.SessionUserResponse;
import com.smartresume.system.mapper.SystemSettingMapper;
import com.smartresume.system.mapper.UserMapper;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SystemAccessService {

    private static final long SETTINGS_ID = 1L;

    private final UserMapper userMapper;
    private final SystemSettingMapper systemSettingMapper;
    private final AuthTokenService authTokenService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public SystemAccessService(
        UserMapper userMapper,
        SystemSettingMapper systemSettingMapper,
        AuthTokenService authTokenService
    ) {
        this.userMapper = userMapper;
        this.systemSettingMapper = systemSettingMapper;
        this.authTokenService = authTokenService;
    }

    @Transactional
    public BootstrapStatusResponse getBootstrapStatus() {
        return new BootstrapStatusResponse(hasUsers(), registrationEnabled());
    }

    public SessionResponse getSession() {
        UserEntity user = requireUser(CurrentUserContext.requireUserId());
        return new SessionResponse(toUserResponse(user), registrationEnabled());
    }

    @Transactional
    public AccessTokenResponse register(String username, String rawPassword) {
        boolean firstUser = !hasUsers();
        if (!firstUser && !registrationEnabled()) {
            throw AppException.of(HttpStatus.FORBIDDEN, "error.system.registrationDisabled");
        }

        String normalizedUsername = normalizeUsername(username);
        if (findUserByUsername(normalizedUsername) != null) {
            throw AppException.of(HttpStatus.CONFLICT, "error.system.usernameExists");
        }

        LocalDateTime now = LocalDateTime.now();
        UserEntity user = new UserEntity();
        user.setUsername(normalizedUsername);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setAdmin(firstUser);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        userMapper.insert(user);
        return issueAccessToken(user);
    }

    @Transactional
    public AccessTokenResponse login(String username, String rawPassword) {
        UserEntity user = findUserByUsername(normalizeUsername(username));
        if (user == null || !passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw AppException.of(HttpStatus.UNAUTHORIZED, "error.system.invalidCredentials");
        }
        return issueAccessToken(user);
    }

    @Transactional
    public void changePassword(String currentPassword, String newPassword) {
        UserEntity user = requireUser(CurrentUserContext.requireUserId());
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw AppException.of(HttpStatus.UNAUTHORIZED, "error.system.currentPasswordIncorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        userMapper.update(user);
    }

    @Transactional
    public RegistrationSettingsResponse updateRegistrationSettings(boolean registrationEnabled) {
        CurrentUserContext.requireAdmin();
        SystemSettingEntity settings = requireSettings();
        settings.setRegistrationEnabled(registrationEnabled);
        settings.setUpdatedAt(LocalDateTime.now());
        systemSettingMapper.update(settings);
        return new RegistrationSettingsResponse(Boolean.TRUE.equals(settings.getRegistrationEnabled()));
    }

    public CurrentUserContext.AuthenticatedUser authenticateAccessToken(String token) {
        AuthTokenService.TokenPayload payload = authTokenService.verifyToken(token);
        UserEntity user = requireUser(payload.userId());
        if (payload.credentialVersion() != credentialVersion(user)) {
            throw AppException.of(HttpStatus.UNAUTHORIZED, "error.auth.tokenRevoked");
        }
        return new CurrentUserContext.AuthenticatedUser(
            user.getId(),
            user.getUsername(),
            Boolean.TRUE.equals(user.getAdmin())
        );
    }

    private AccessTokenResponse issueAccessToken(UserEntity user) {
        String token = authTokenService.createToken(user.getId(), credentialVersion(user));
        return new AccessTokenResponse(token, toUserResponse(user));
    }

    private boolean hasUsers() {
        return userMapper.selectCountByQuery(QueryWrapper.create()) > 0;
    }

    private boolean registrationEnabled() {
        SystemSettingEntity settings = systemSettingMapper.selectOneById(SETTINGS_ID);
        return settings == null || Boolean.TRUE.equals(settings.getRegistrationEnabled());
    }

    private SystemSettingEntity requireSettings() {
        SystemSettingEntity settings = systemSettingMapper.selectOneById(SETTINGS_ID);
        if (settings != null) {
            return settings;
        }

        LocalDateTime now = LocalDateTime.now();
        SystemSettingEntity created = new SystemSettingEntity();
        created.setId(SETTINGS_ID);
        created.setRegistrationEnabled(true);
        created.setCreatedAt(now);
        created.setUpdatedAt(now);
        systemSettingMapper.insert(created);
        return created;
    }

    private UserEntity findUserByUsername(String username) {
        UserEntityTableDef user = UserEntityTableDef.USER_ENTITY;
        QueryWrapper query = QueryWrapper.create().where(user.USERNAME.eq(username));
        return userMapper.selectListByQuery(query).stream().findFirst().orElse(null);
    }

    private UserEntity requireUser(long userId) {
        UserEntity user = userMapper.selectOneById(userId);
        if (user == null) {
            throw AppException.of(HttpStatus.UNAUTHORIZED, "error.system.userNotFound");
        }
        return user;
    }

    private SessionUserResponse toUserResponse(UserEntity user) {
        return new SessionUserResponse(
            user.getId(),
            user.getUsername(),
            Boolean.TRUE.equals(user.getAdmin())
        );
    }

    private long credentialVersion(UserEntity user) {
        LocalDateTime marker = user.getUpdatedAt() == null ? user.getCreatedAt() : user.getUpdatedAt();
        return marker.toEpochSecond(ZoneOffset.UTC);
    }

    private String normalizeUsername(String username) {
        return username.trim().toLowerCase(Locale.ROOT);
    }
}
