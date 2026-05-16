package com.smartresume.ai.domain;

import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import java.time.LocalDateTime;

@Table("ai_chat_conversations")
public class AiChatConversationEntity {

    @Id(keyType = KeyType.None)
    private String conversationId;
    private String resumeId;
    private String title;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public String getConversationId() {
        return conversationId;
    }

    public void setConversationId(String conversationId) {
        this.conversationId = conversationId;
    }

    public String getResumeId() {
        return resumeId;
    }

    public void setResumeId(String resumeId) {
        this.resumeId = resumeId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
