package com.smartresume.ai.config;

import javax.sql.DataSource;
import org.springframework.ai.chat.memory.repository.jdbc.JdbcChatMemoryRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration
public class AiChatMemoryConfig {

    @Bean
    public JdbcChatMemoryRepository jdbcChatMemoryRepository(
        DataSource dataSource,
        PlatformTransactionManager transactionManager
    ) {
        return JdbcChatMemoryRepository.builder()
            .dataSource(dataSource)
            .transactionManager(transactionManager)
            .build();
    }
}
