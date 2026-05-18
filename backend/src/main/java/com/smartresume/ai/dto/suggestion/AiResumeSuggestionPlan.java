package com.smartresume.ai.dto.suggestion;

import java.util.List;

/**
 * Container for a batch of AI resume suggestions.
 * Emitted as the content of a type=suggestion SSE event.
 */
public record AiResumeSuggestionPlan(
    List<AiResumeSuggestion> suggestions,
    String summary
) {
}
