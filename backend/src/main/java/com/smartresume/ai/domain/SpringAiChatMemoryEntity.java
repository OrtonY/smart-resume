package com.smartresume.ai.domain;

import com.mybatisflex.annotation.Table;
import java.time.LocalDateTime;

@Table("spring_ai_chat_memory")
public class SpringAiChatMemoryEntity {

    private String conversationId;
    private String content;
    private String type;
    private LocalDateTime timestamp;

    public String getConversationId() {
        return conversationId;
    }

    public void setConversationId(String conversationId) {
        this.conversationId = conversationId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
