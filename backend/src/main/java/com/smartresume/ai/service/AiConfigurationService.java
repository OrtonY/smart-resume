package com.smartresume.ai.service;

import com.smartresume.ai.domain.AiConfigurationEntity;
import com.smartresume.ai.dto.AiDtos.AiConfigurationRequest;
import com.smartresume.ai.dto.AiDtos.AiConfigurationResponse;
import com.smartresume.ai.mapper.AiConfigurationMapper;
import com.smartresume.common.exception.AppException;
import java.time.LocalDateTime;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiConfigurationService {

    private static final long SINGLETON_ID = 1L;
    private static final String OLLAMA_VENDOR = "Ollama";

    private final AiConfigurationMapper aiConfigurationMapper;

    public AiConfigurationService(AiConfigurationMapper aiConfigurationMapper) {
        this.aiConfigurationMapper = aiConfigurationMapper;
    }

    public AiConfigurationResponse getConfiguration() {
        AiConfigurationEntity configuration = aiConfigurationMapper.selectOneById(SINGLETON_ID);
        if (configuration == null) {
            return new AiConfigurationResponse("", "", "", false);
        }
        return toResponse(configuration);
    }

    public AiConfigurationEntity requireConfiguration() {
        AiConfigurationEntity configuration = aiConfigurationMapper.selectOneById(SINGLETON_ID);
        if (configuration == null) {
            throw new AppException(HttpStatus.PRECONDITION_REQUIRED, "AI configuration has not been configured");
        }
        return configuration;
    }

    @Transactional
    public AiConfigurationResponse saveConfiguration(AiConfigurationRequest request) {
        AiConfigurationEntity configuration = aiConfigurationMapper.selectOneById(SINGLETON_ID);
        LocalDateTime now = LocalDateTime.now();
        boolean exists = configuration != null;
        if (!exists) {
            configuration = new AiConfigurationEntity();
            configuration.setId(SINGLETON_ID);
            configuration.setCreatedAt(now);
        }
        String apiKey = request.apiKey() == null ? "" : request.apiKey().trim();
        String vendor = request.vendor().trim();
        if (apiKey.isBlank() && !isApiKeyOptional(vendor) && !hasExistingApiKey(configuration)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "API key is required");
        }
        configuration.setVendor(vendor);
        configuration.setBaseUrl(request.baseUrl().trim());
        if (!apiKey.isBlank() || isApiKeyOptional(vendor)) {
            configuration.setApiKey(apiKey);
        }
        configuration.setModelName(request.modelName().trim());
        configuration.setUpdatedAt(now);

        if (exists) {
            aiConfigurationMapper.update(configuration);
        } else {
            aiConfigurationMapper.insert(configuration);
        }
        return toResponse(configuration);
    }

    private boolean isApiKeyOptional(String vendor) {
        return OLLAMA_VENDOR.equalsIgnoreCase(vendor);
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
