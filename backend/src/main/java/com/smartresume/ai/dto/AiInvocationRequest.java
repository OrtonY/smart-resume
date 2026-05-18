package com.smartresume.ai.dto;

public record AiInvocationRequest(
    String systemPrompt,
    String userMessage,
    String conversationId
) {
}
