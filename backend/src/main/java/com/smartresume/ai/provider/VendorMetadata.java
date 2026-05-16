package com.smartresume.ai.provider;

import java.util.List;

/**
 * Metadata describing a vendor's configuration fields, defaults, and placeholders.
 */
public record VendorMetadata(
    String vendor,
    String defaultBaseUrl,
    String baseUrlPlaceholder,
    String apiKeyPlaceholder,
    String modelNamePlaceholder,
    boolean apiKeyRequired,
    List<String> suggestedModels
) {
}
