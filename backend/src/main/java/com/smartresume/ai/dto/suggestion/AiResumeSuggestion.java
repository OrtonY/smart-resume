package com.smartresume.ai.dto.suggestion;

/**
 * A single AI-generated resume improvement suggestion.
 * Designed for reuse across chat suggestions and (future) scoring apply flow.
 */
public record AiResumeSuggestion(
    String id,
    ResumeSection section,
    Integer index,
    String field,
    String currentValue,
    String suggestedValue,
    String rationale
) {
}
