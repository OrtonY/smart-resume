package com.smartresume.interview.service;

import java.util.Set;

final class InterviewConstants {

    static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
    static final String STATUS_PAUSED = "PAUSED";
    static final String STATUS_ENDED = "ENDED";
    static final String REPORT_PENDING = "PENDING";
    static final String COMPANY_CONTEXT_NOT_REQUESTED = "NOT_REQUESTED";
    static final String COMPANY_CONTEXT_READY = "READY";
    static final String COMPANY_CONTEXT_FAILED = "FAILED";
    static final String QUESTION_BANK_RELEVANCE_LOW = "LOW";
    static final String QUESTION_BANK_RELEVANCE_MEDIUM = "MEDIUM";
    static final String QUESTION_BANK_RELEVANCE_HIGH = "HIGH";
    static final Set<String> DIFFICULTIES = Set.of("EASY", "MEDIUM", "HARD");
    static final Set<String> STATUSES = Set.of(STATUS_IN_PROGRESS, STATUS_PAUSED, STATUS_ENDED);
    static final Set<String> QUESTION_BANK_RELEVANCES = Set.of(
        QUESTION_BANK_RELEVANCE_LOW,
        QUESTION_BANK_RELEVANCE_MEDIUM,
        QUESTION_BANK_RELEVANCE_HIGH
    );
    static final int MAX_QUESTIONS_PER_ROUND = 18;
    static final int QUESTION_LIMIT_WARNING_THRESHOLD = 3;
    static final int QUESTION_BANK_LOW_LIMIT = 3;
    static final int QUESTION_BANK_MEDIUM_LIMIT = 5;
    static final int QUESTION_BANK_HIGH_LIMIT = 8;
    static final int MIN_COMPANY_CONTEXT_SUMMARY_ITEMS = 2;
    static final int MAX_COMPANY_CONTEXT_SUMMARY_ITEMS = 3;
    static final int MIN_COMPANY_CONTEXT_SUMMARY_LENGTH = 18;
    static final int MAX_COMPANY_CONTEXT_SUMMARY_LENGTH = 36;
    static final int SCORE_MIN = 0;
    static final int SCORE_MAX = 100;

    private InterviewConstants() {
    }
}
