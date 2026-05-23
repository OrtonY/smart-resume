package com.smartresume.common.security;

import com.smartresume.common.exception.AppException;
import org.springframework.http.HttpStatus;

public final class CurrentUserContext {

    private static final ThreadLocal<AuthenticatedUser> CURRENT_USER = new ThreadLocal<>();

    private CurrentUserContext() {
    }

    public static void set(AuthenticatedUser user) {
        CURRENT_USER.set(user);
    }

    public static AuthenticatedUser get() {
        return CURRENT_USER.get();
    }

    public static AuthenticatedUser require() {
        AuthenticatedUser user = get();
        if (user == null) {
            throw AppException.of(HttpStatus.UNAUTHORIZED, "error.auth.required");
        }
        return user;
    }

    public static long requireUserId() {
        return require().userId();
    }

    public static void requireAdmin() {
        if (!require().admin()) {
            throw AppException.of(HttpStatus.FORBIDDEN, "error.auth.adminRequired");
        }
    }

    public static void clear() {
        CURRENT_USER.remove();
    }

    public record AuthenticatedUser(long userId, String username, boolean admin) {
    }
}
