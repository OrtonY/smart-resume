package com.smartresume.common.config;

import com.smartresume.common.security.AuthTokenInterceptor;
import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final AuthTokenInterceptor authTokenInterceptor;

    public WebMvcConfig(AuthTokenInterceptor authTokenInterceptor) {
        this.authTokenInterceptor = authTokenInterceptor;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*")
            .allowedMethods("*")
            .allowedHeaders("*")
            .exposedHeaders("X-Access-Token")
            .allowCredentials(false);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authTokenInterceptor)
            .addPathPatterns("/api/**")
            .excludePathPatterns(List.of(
                "/api/system/bootstrap",
                "/api/system/password/setup",
                "/api/system/password/verify",
                "/api/public/**",
                "/actuator/health",
                "/error"
            ));
    }
}
