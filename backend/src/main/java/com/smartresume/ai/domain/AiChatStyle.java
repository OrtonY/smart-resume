package com.smartresume.ai.domain;

public enum AiChatStyle {
    NORMAL,
    SAVAGE,
    SARCASTIC;

    public static AiChatStyle fromValue(String value) {
        if (value == null || value.isBlank()) {
            return NORMAL;
        }
        try {
            return valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            return NORMAL;
        }
    }
}
