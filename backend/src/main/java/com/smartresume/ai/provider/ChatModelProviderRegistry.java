package com.smartresume.ai.provider;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * Registry that holds all ChatModelProvider implementations and resolves by vendor name.
 */
@Component
public class ChatModelProviderRegistry {

    private final List<ChatModelProvider> providers;

    public ChatModelProviderRegistry(List<ChatModelProvider> providers) {
        this.providers = providers;
    }

    /**
     * Finds the provider that supports the given vendor.
     * Returns empty if no specific provider matches.
     */
    public Optional<ChatModelProvider> findProvider(String vendor) {
        return providers.stream()
            .filter(provider -> provider.supports(vendor))
            .findFirst();
    }

    /**
     * Returns all registered providers' metadata.
     */
    public List<VendorMetadata> getAllMetadata() {
        return providers.stream()
            .map(ChatModelProvider::getMetadata)
            .toList();
    }
}
