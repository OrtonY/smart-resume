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
            throw new AppException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        return user;
    }

    public static long requireUserId() {
        return require().userId();
    }

    public static void requireAdmin() {
        if (!require().admin()) {
            throw new AppException(HttpStatus.FORBIDDEN, "Admin access is required");
        }
    }

    public static void clear() {
        CURRENT_USER.remove();
    }

    public record AuthenticatedUser(long userId, String username, boolean admin) {
    }
}
