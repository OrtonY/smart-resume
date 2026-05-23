package com.smartresume.common.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Helpers for fields that may be stored either as a plain string or as a
 * locale-keyed object such as {@code {"zh": "...", "en": "..."}}.
 *
 * <p>Used by the resume template catalog (D7 in the i18n PRD): built-in
 * templates ship a localized object so the same payload can render in either
 * Chinese or English, while user-created templates only carry a single
 * language and are stored as plain strings.
 */
public final class LocalizedFields {

    private static final String ZH_KEY = "zh";
    private static final String EN_KEY = "en";

    private LocalizedFields() {
    }

    /**
     * Resolve a field that may be either a {@link String} or a {@link Map}
     * keyed by language tag. Returns {@code null} when the input is null or
     * empty.
     */
    public static String getLocalizedField(Object field, Locale locale) {
        if (field == null) {
            return null;
        }
        if (field instanceof CharSequence s) {
            return s.toString();
        }
        if (field instanceof Map<?, ?> map) {
            String preferred = preferLanguage(locale);
            String value = readEntry(map, preferred);
            if (value != null) {
                return value;
            }
            String fallback = ZH_KEY.equals(preferred) ? EN_KEY : ZH_KEY;
            value = readEntry(map, fallback);
            if (value != null) {
                return value;
            }
            for (Object raw : map.values()) {
                if (raw != null) {
                    return raw.toString();
                }
            }
            return null;
        }
        return field.toString();
    }

    /**
     * Decode a value loaded from a plain-string database column. If the stored
     * text is a JSON object literal it is returned as a {@code Map<String,
     * String>}; otherwise the original string is returned unchanged. When the
     * input is null or blank, returns null.
     */
    public static Object decodeStored(String stored, ObjectMapper mapper) {
        if (stored == null) {
            return null;
        }
        String trimmed = stored.trim();
        if (trimmed.isEmpty()) {
            return stored;
        }
        if (trimmed.charAt(0) == '{') {
            try {
                JsonNode node = mapper.readTree(trimmed);
                if (node != null && node.isObject()) {
                    Map<String, String> result = new LinkedHashMap<>();
                    Iterator<Map.Entry<String, JsonNode>> iterator = node.fields();
                    while (iterator.hasNext()) {
                        Map.Entry<String, JsonNode> entry = iterator.next();
                        JsonNode valueNode = entry.getValue();
                        if (valueNode != null && valueNode.isTextual()) {
                            result.put(entry.getKey(), valueNode.asText());
                        }
                    }
                    if (!result.isEmpty()) {
                        return result;
                    }
                }
            } catch (IOException ignored) {
                // fall through, treat as plain literal
            }
        }
        return stored;
    }

    /**
     * Encode a localized value for storage in a plain-string column. Strings
     * pass through; Maps are JSON-serialized.
     */
    public static String encodeForStorage(Object field, ObjectMapper mapper) {
        if (field == null) {
            return null;
        }
        if (field instanceof CharSequence s) {
            return s.toString();
        }
        try {
            return mapper.writeValueAsString(field);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Unable to serialize localized field", e);
        }
    }

    private static String preferLanguage(Locale locale) {
        if (locale == null) {
            return ZH_KEY;
        }
        String language = locale.getLanguage();
        if (language == null || language.isEmpty()) {
            return ZH_KEY;
        }
        return EN_KEY.equalsIgnoreCase(language) ? EN_KEY : ZH_KEY;
    }

    private static String readEntry(Map<?, ?> map, String key) {
        Object value = map.get(key);
        if (value == null) {
            return null;
        }
        String text = value.toString();
        return text.isEmpty() ? null : text;
    }
}
