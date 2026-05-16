package com.smartresume.ai.provider;

import com.smartresume.ai.domain.AiConfigurationEntity;
import java.util.List;
import org.springframework.ai.chat.model.ChatModel;

/**
 * Strategy interface for vendor-specific AI chat model creation.
 * Each vendor implements this interface and registers as a Spring component.
 */
public interface ChatModelProvider {

    /**
     * Returns true if this provider handles the given vendor name.
     */
    boolean supports(String vendor);

    /**
     * Creates a ChatModel instance from the given configuration.
     */
    ChatModel createChatModel(AiConfigurationEntity config);

    /**
     * Lists available models from the remote API using the provided credentials.
     */
    List<String> listModels(String baseUrl, String apiKey);

    /**
     * Returns metadata about this vendor (defaults, placeholders, etc.).
     */
    VendorMetadata getMetadata();
}
