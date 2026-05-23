package com.smartresume.common.exception;

import org.springframework.http.HttpStatus;

public class AppException extends RuntimeException {

    private final HttpStatus status;
    private final String messageKey;
    private final Object[] messageArgs;

    /**
     * Legacy constructor that carries a literal message. Use this only when the
     * caller already produced a resolved string (for example, AI prompt services
     * that build dynamic English error text). New call sites should prefer
     * {@link #of(HttpStatus, String, Object...)} so the global exception handler
     * can localize the message based on the request locale.
     */
    public AppException(HttpStatus status, String message) {
        super(message);
        this.status = status;
        this.messageKey = null;
        this.messageArgs = null;
    }

    private AppException(HttpStatus status, String messageKey, Object[] messageArgs) {
        super(messageKey);
        this.status = status;
        this.messageKey = messageKey;
        this.messageArgs = messageArgs;
    }

    public static AppException of(HttpStatus status, String messageKey, Object... messageArgs) {
        return new AppException(status, messageKey, messageArgs);
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getMessageKey() {
        return messageKey;
    }

    public Object[] getMessageArgs() {
        return messageArgs;
    }

    public boolean hasMessageKey() {
        return messageKey != null;
    }
}
