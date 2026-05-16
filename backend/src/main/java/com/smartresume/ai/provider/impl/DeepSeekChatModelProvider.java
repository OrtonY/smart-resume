package com.smartresume.ai.provider.impl;

import com.smartresume.ai.domain.AiConfigurationEntity;
import com.smartresume.ai.provider.ChatModelProvider;
import com.smartresume.ai.provider.VendorMetadata;
import io.micrometer.observation.ObservationRegistry;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.ai.retry.RetryUtils;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Provider for DeepSeek models.
 * Uses OpenAI-compatible protocol internally with DeepSeek's default base URL.
 */
@Component
public class DeepSeekChatModelProvider implements ChatModelProvider {

    private static final String VENDOR = "DeepSeek";
    private static final String DEFAULT_BASE_URL = "https://api.deepseek.com";

    @Override
    public boolean supports(String vendor) {
        return VENDOR.equalsIgnoreCase(vendor);
    }

    @Override
    public ChatModel createChatModel(AiConfigurationEntity config) {
        String baseUrl = resolveBaseUrl(config.getBaseUrl());
        OpenAiApi openAiApi = OpenAiApi.builder()
            .baseUrl(baseUrl)
            .apiKey(config.getApiKey())
            .build();
        OpenAiChatOptions options = OpenAiChatOptions.builder()
            .model(config.getModelName())
            .temperature(0.3)
            .build();
        return OpenAiChatModel.builder()
            .openAiApi(openAiApi)
            .defaultOptions(options)
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
            .defaultHeader("Authorization", "Bearer " + apiKey)
            .build();
        Map<String, Object> response = restClient.get()
            .uri("/v1/models")
            .retrieve()
            .body(Map.class);
        if (response == null || !response.containsKey("data")) {
            return List.of();
        }
        List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
        List<String> models = new ArrayList<>();
        for (Map<String, Object> model : data) {
            Object id = model.get("id");
            if (id != null) {
                models.add(id.toString());
            }
        }
        models.sort(String::compareTo);
        return models;
    }

    @Override
    public VendorMetadata getMetadata() {
        return new VendorMetadata(
            VENDOR,
            DEFAULT_BASE_URL,
            "https://api.deepseek.com",
            "sk-...",
            "deepseek-chat",
            true,
            List.of()
        );
    }

    private String resolveBaseUrl(String baseUrl) {
        return (baseUrl == null || baseUrl.isBlank()) ? DEFAULT_BASE_URL : baseUrl.trim();
    }
}
