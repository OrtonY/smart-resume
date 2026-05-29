package com.smartresume.ai.memory;

public enum AiFeatureType {
    RESUME_CHAT("resume_chat"),
    RESUME_SCORE("resume_score"),
    RESUME_IMPORT("resume_import"),
    INTERVIEW("interview"),
    INTERVIEW_REPORT("interview_report");

    private final String code;

    AiFeatureType(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
