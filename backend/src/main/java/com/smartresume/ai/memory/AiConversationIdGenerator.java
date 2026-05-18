package com.smartresume.ai.memory;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public final class AiConversationIdGenerator {

    private static final DateTimeFormatter TS_FORMAT =
        DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");

    private AiConversationIdGenerator() {
    }

    public static String generate(String resumeId, AiFeatureType feature) {
        String resumePart = (resumeId == null || resumeId.isBlank()) ? "default" : resumeId;
        return resumePart + "_" + feature.getCode() + "_" + LocalDateTime.now().format(TS_FORMAT);
    }
}
