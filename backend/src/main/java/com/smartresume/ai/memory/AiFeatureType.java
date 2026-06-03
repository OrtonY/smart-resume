package com.smartresume.ai.memory;

public enum AiFeatureType {
    RESUME_CHAT("resume_chat"),
    RESUME_BULLET_REWRITE("resume_bullet_rewrite"),
    RESUME_TRANSLATION("resume_translation"),
    RESUME_COVER_LETTER("resume_cover_letter"),
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
