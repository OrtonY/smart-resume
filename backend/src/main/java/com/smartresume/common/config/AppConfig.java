package com.smartresume.common.config;

import com.smartresume.common.security.AuthTokenProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(AuthTokenProperties.class)
public class AppConfig {
}
