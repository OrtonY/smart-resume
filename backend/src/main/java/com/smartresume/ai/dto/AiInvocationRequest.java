package com.smartresume.ai.dto;

import java.util.function.UnaryOperator;

public record AiInvocationRequest(
    String systemPrompt,
    String userMessage,
    String conversationId,
    UnaryOperator<String> persistenceSanitizer
) {
    public AiInvocationRequest(String systemPrompt, String userMessage, String conversationId) {
        this(systemPrompt, userMessage, conversationId, null);
    }
}
