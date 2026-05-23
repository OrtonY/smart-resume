package com.smartresume.ai.service;

import com.smartresume.ai.domain.AiConfigurationEntity;
import com.smartresume.ai.dto.AiDtos.AiConfigurationRequest;
import com.smartresume.ai.dto.AiDtos.AiConfigurationResponse;
import com.smartresume.ai.mapper.AiConfigurationMapper;
import com.smartresume.ai.provider.ChatModelProviderRegistry;
import com.smartresume.ai.provider.VendorMetadata;
import com.smartresume.common.exception.AppException;
import com.smartresume.common.security.CurrentUserContext;
import java.time.LocalDateTime;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiConfigurationService {

    private final AiConfigurationMapper aiConfigurationMapper;
    private final ChatModelProviderRegistry chatModelProviderRegistry;

    public AiConfigurationService(
        AiConfigurationMapper aiConfigurationMapper,
        ChatModelProviderRegistry chatModelProviderRegistry
    ) {
        this.aiConfigurationMapper = aiConfigurationMapper;
        this.chatModelProviderRegistry = chatModelProviderRegistry;
    }

    public AiConfigurationResponse getConfiguration() {
        AiConfigurationEntity configuration = aiConfigurationMapper.selectOneById(CurrentUserContext.requireUserId());
        if (configuration == null) {
            return new AiConfigurationResponse("", "", "", false);
        }
        return toResponse(configuration);
    }

    public AiConfigurationEntity requireConfiguration() {
        AiConfigurationEntity configuration = aiConfigurationMapper.selectOneById(CurrentUserContext.requireUserId());
        if (configuration == null) {
            throw AppException.of(HttpStatus.PRECONDITION_REQUIRED, "error.ai.notConfigured");
        }
        return configuration;
    }

    @Transactional
    public AiConfigurationResponse saveConfiguration(AiConfigurationRequest request) {
        long userId = CurrentUserContext.requireUserId();
        AiConfigurationEntity configuration = aiConfigurationMapper.selectOneById(userId);
        LocalDateTime now = LocalDateTime.now();
        boolean exists = configuration != null;
        if (!exists) {
            configuration = new AiConfigurationEntity();
            configuration.setId(userId);
            configuration.setUserId(userId);
            configuration.setCreatedAt(now);
        }

        String vendor = request.vendor().trim();
        String apiKey = request.apiKey() == null ? "" : request.apiKey().trim();
        String baseUrl = request.baseUrl() == null ? "" : request.baseUrl().trim();
        String modelName = request.modelName() == null ? "" : request.modelName().trim();

        // Apply provider defaults for empty fields
        VendorMetadata metadata = chatModelProviderRegistry.findProvider(vendor)
            .map(p -> p.getMetadata())
            .orElse(null);

        if (baseUrl.isBlank() && metadata != null) {
            baseUrl = metadata.defaultBaseUrl();
        }

        if (apiKey.isBlank() && isApiKeyRequired(vendor, metadata) && !hasExistingApiKey(configuration)) {
            throw AppException.of(HttpStatus.BAD_REQUEST, "error.ai.apiKeyRequired");
        }

        configuration.setVendor(vendor);
        configuration.setBaseUrl(baseUrl);
        if (!apiKey.isBlank() || !isApiKeyRequired(vendor, metadata)) {
            configuration.setApiKey(apiKey);
        }
        configuration.setModelName(modelName);
        configuration.setUserId(userId);
        configuration.setUpdatedAt(now);

        if (exists) {
            aiConfigurationMapper.update(configuration);
        } else {
            aiConfigurationMapper.insert(configuration);
        }
        return toResponse(configuration);
    }

    private boolean isApiKeyRequired(String vendor, VendorMetadata metadata) {
        if (metadata != null) {
            return metadata.apiKeyRequired();
        }
        // Fallback: Ollama doesn't need API key
        return !"Ollama".equalsIgnoreCase(vendor);
    }

    private boolean hasExistingApiKey(AiConfigurationEntity configuration) {
        return configuration != null
            && configuration.getApiKey() != null
            && !configuration.getApiKey().isBlank();
    }

    private AiConfigurationResponse toResponse(AiConfigurationEntity configuration) {
        return new AiConfigurationResponse(
            configuration.getVendor(),
            configuration.getBaseUrl(),
            configuration.getModelName(),
            true
        );
    }
}
