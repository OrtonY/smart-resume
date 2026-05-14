package com.smartresume.common.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth")
public record AuthTokenProperties(String tokenSecret, long tokenValidityDays) {
}
