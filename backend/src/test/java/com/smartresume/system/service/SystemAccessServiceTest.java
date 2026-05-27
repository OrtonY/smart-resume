package com.smartresume.system.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.AuthTokenService;
import com.smartresume.common.security.CurrentUserContext;
import com.smartresume.system.domain.UserEntity;
import com.smartresume.system.mapper.SystemSettingMapper;
import com.smartresume.system.mapper.UserMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@ExtendWith(MockitoExtension.class)
class SystemAccessServiceTest {

    @Mock
    private UserMapper userMapper;

    @Mock
    private SystemSettingMapper systemSettingMapper;

    @Mock
    private AuthTokenService authTokenService;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final Clock fixedClock = Clock.fixed(Instant.parse("2026-05-27T02:00:00Z"), ZoneOffset.UTC);
    private SystemAccessService service;

    @BeforeEach
    void setUp() {
        service = new SystemAccessService(userMapper, systemSettingMapper, authTokenService, fixedClock);
    }

    @AfterEach
    void tearDown() {
        CurrentUserContext.clear();
    }

    @Test
    void changePasswordSuccess() {
        UserEntity user = new UserEntity();
        user.setId(2L);
        user.setPasswordHash(passwordEncoder.encode("old-pass"));
        user.setCreatedAt(LocalDateTime.ofEpochSecond(1_000L, 0, ZoneOffset.UTC));
        user.setUpdatedAt(LocalDateTime.ofEpochSecond(1_000L, 0, ZoneOffset.UTC));
        CurrentUserContext.set(new CurrentUserContext.AuthenticatedUser(2L, "member", false));
        when(userMapper.selectOneById(2L)).thenReturn(user);

        service.changePassword("old-pass", "new-pass");

        ArgumentCaptor<UserEntity> captor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userMapper).update(captor.capture());
        assertThat(passwordEncoder.matches("new-pass", captor.getValue().getPasswordHash())).isTrue();
        assertThat(captor.getValue().getUpdatedAt()).isEqualTo(LocalDateTime.ofEpochSecond(fixedClock.instant().getEpochSecond(), 0, ZoneOffset.UTC));
    }

    @Test
    void changePasswordFailsWhenCurrentPasswordIsWrong() {
        UserEntity user = new UserEntity();
        user.setId(3L);
        user.setPasswordHash(passwordEncoder.encode("correct"));
        user.setCreatedAt(LocalDateTime.ofEpochSecond(2_000L, 0, ZoneOffset.UTC));
        user.setUpdatedAt(LocalDateTime.ofEpochSecond(2_000L, 0, ZoneOffset.UTC));
        CurrentUserContext.set(new CurrentUserContext.AuthenticatedUser(3L, "member", false));
        when(userMapper.selectOneById(3L)).thenReturn(user);

        assertThatThrownBy(() -> service.changePassword("wrong", "new-pass"))
            .isInstanceOf(AppException.class)
            .satisfies((error) -> {
                AppException appException = (AppException) error;
                assertThat(appException.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
            });
        verify(userMapper, never()).update(any(UserEntity.class));
    }

    @Test
    void changePasswordBumpsCredentialVersionWhenCurrentSecondMatchesExistingVersion() {
        long currentSecond = fixedClock.instant().getEpochSecond();
        UserEntity user = new UserEntity();
        user.setId(4L);
        user.setUsername("member");
        user.setPasswordHash(passwordEncoder.encode("old-pass"));
        user.setCreatedAt(LocalDateTime.ofEpochSecond(currentSecond, 0, ZoneOffset.UTC));
        user.setUpdatedAt(LocalDateTime.ofEpochSecond(currentSecond, 0, ZoneOffset.UTC));
        CurrentUserContext.set(new CurrentUserContext.AuthenticatedUser(4L, "member", false));
        when(userMapper.selectOneById(4L)).thenReturn(user);

        service.changePassword("old-pass", "new-pass");

        ArgumentCaptor<UserEntity> updateCaptor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userMapper).update(updateCaptor.capture());
        UserEntity updatedUser = updateCaptor.getValue();
        assertThat(updatedUser.getUpdatedAt()).isEqualTo(LocalDateTime.ofEpochSecond(currentSecond + 1, 0, ZoneOffset.UTC));

        AuthTokenService.TokenPayload oldPayload = new AuthTokenService.TokenPayload(
            currentSecond,
            currentSecond + 86_400,
            4L,
            currentSecond,
            "nonce"
        );
        when(authTokenService.verifyToken("old-token")).thenReturn(oldPayload);
        when(userMapper.selectOneById(4L)).thenReturn(updatedUser);

        assertThatThrownBy(() -> service.authenticateAccessToken("old-token"))
            .isInstanceOf(AppException.class)
            .satisfies((error) -> {
                AppException appException = (AppException) error;
                assertThat(appException.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
            });
    }
}
