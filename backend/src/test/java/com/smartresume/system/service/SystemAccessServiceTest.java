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
    private SystemAccessService service;

    @BeforeEach
    void setUp() {
        service = new SystemAccessService(userMapper, systemSettingMapper, authTokenService);
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
        CurrentUserContext.set(new CurrentUserContext.AuthenticatedUser(2L, "member", false));
        when(userMapper.selectOneById(2L)).thenReturn(user);

        service.changePassword("old-pass", "new-pass");

        ArgumentCaptor<UserEntity> captor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userMapper).update(captor.capture());
        assertThat(passwordEncoder.matches("new-pass", captor.getValue().getPasswordHash())).isTrue();
    }

    @Test
    void changePasswordFailsWhenCurrentPasswordIsWrong() {
        UserEntity user = new UserEntity();
        user.setId(3L);
        user.setPasswordHash(passwordEncoder.encode("correct"));
        CurrentUserContext.set(new CurrentUserContext.AuthenticatedUser(3L, "member", false));
        when(userMapper.selectOneById(3L)).thenReturn(user);

        assertThatThrownBy(() -> service.changePassword("wrong", "new-pass"))
            .isInstanceOf(AppException.class)
            .satisfies((error) -> {
                AppException appException = (AppException) error;
                assertThat(appException.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
            });
        verify(userMapper, never()).update(any(UserEntity.class));
    }
}
