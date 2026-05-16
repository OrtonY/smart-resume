package com.smartresume.ai.provider.impl;

import com.smartresume.ai.domain.AiConfigurationEntity;
import com.smartresume.ai.provider.ChatModelProvider;
import com.smartresume.ai.provider.VendorMetadata;
import io.micrometer.observation.ObservationRegistry;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.ollama.api.OllamaApi;
import org.springframework.ai.ollama.api.OllamaChatOptions;
import org.springframework.ai.retry.RetryUtils;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Provider for Ollama local models.
 * API key is not required for Ollama.
 */
@Component
public class OllamaChatModelProvider implements ChatModelProvider {

    private static final String VENDOR = "Ollama";
    private static final String DEFAULT_BASE_URL = "http://localhost:11434";

    @Override
    public boolean supports(String vendor) {
        return VENDOR.equalsIgnoreCase(vendor);
    }

    @Override
    public ChatModel createChatModel(AiConfigurationEntity config) {
        String baseUrl = resolveBaseUrl(config.getBaseUrl());
        return OllamaChatModel.builder()
            .ollamaApi(OllamaApi.builder()
                .baseUrl(baseUrl)
                .build())
            .defaultOptions(OllamaChatOptions.builder()
                .model(config.getModelName())
                .temperature(0.3)
                .build())
            .retryTemplate(RetryUtils.DEFAULT_RETRY_TEMPLATE)
            .observationRegistry(ObservationRegistry.NOOP)
            .build();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<String> listModels(String baseUrl, String apiKey) {
        String url = resolveBaseUrl(baseUrl);
        RestClient restClient = RestClient.builder()
            .baseUrl(url)
            .build();
        Map<String, Object> response = restClient.get()
            .uri("/api/tags")
            .retrieve()
            .body(Map.class);
        if (response == null || !response.containsKey("models")) {
            return List.of();
        }
        List<Map<String, Object>> models = (List<Map<String, Object>>) response.get("models");
        List<String> result = new ArrayList<>();
        for (Map<String, Object> model : models) {
            Object name = model.get("name");
            if (name != null) {
                result.add(name.toString());
            }
        }
        result.sort(String::compareTo);
        return result;
    }

    @Override
    public VendorMetadata getMetadata() {
        return new VendorMetadata(
            VENDOR,
            DEFAULT_BASE_URL,
            "http://localhost:11434",
            "Not required",
            "llama3.1",
            false,
            List.of("llama3.1", "llama3", "qwen2.5", "deepseek-r1")
        );
    }

    private String resolveBaseUrl(String baseUrl) {
        return (baseUrl == null || baseUrl.isBlank()) ? DEFAULT_BASE_URL : baseUrl.trim();
    }
}
