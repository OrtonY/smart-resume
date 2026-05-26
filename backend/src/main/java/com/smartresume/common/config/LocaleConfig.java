package com.smartresume.common.config;

import java.util.List;
import java.util.Locale;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

/**
 * Internationalization configuration. Resolves the request locale from the
 * {@code Accept-Language} header (falling back to {@code zh-CN}) and loads
 * user-facing messages from the {@code messages} resource bundle. Bean
 * validation messages share the same {@code MessageSource} so DTO annotation
 * placeholders such as {@code @NotBlank(message = "{user.username.required}")}
 * resolve against {@code messages.properties} / {@code messages_en.properties}.
 */
@Configuration
public class LocaleConfig {

    public static final Locale DEFAULT_LOCALE = Locale.forLanguageTag("zh-CN");

    @Bean
    public LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
        resolver.setDefaultLocale(DEFAULT_LOCALE);
        resolver.setSupportedLocales(List.of(DEFAULT_LOCALE, Locale.ENGLISH, Locale.US, Locale.UK));
        return resolver;
    }

    @Bean
    public MessageSource messageSource() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasenames("messages");
        source.setDefaultEncoding("UTF-8");
        source.setDefaultLocale(DEFAULT_LOCALE);
        source.setFallbackToSystemLocale(false);
        source.setUseCodeAsDefaultMessage(true);
        return source;
    }

    @Bean
    public LocalValidatorFactoryBean validator(MessageSource messageSource) {
        LocalValidatorFactoryBean factory = new LocalValidatorFactoryBean();
        factory.setValidationMessageSource(messageSource);
        return factory;
    }
}
