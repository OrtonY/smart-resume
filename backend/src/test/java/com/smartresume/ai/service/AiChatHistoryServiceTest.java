package com.smartresume.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartresume.ai.domain.AiChatConversationEntity;
import com.smartresume.ai.domain.AiChatSuggestionEntity;
import com.smartresume.ai.mapper.AiChatConversationMapper;
import com.smartresume.ai.mapper.AiChatSuggestionMapper;
import com.smartresume.resume.service.ResumeService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.memory.repository.jdbc.JdbcChatMemoryRepository;
import org.springframework.ai.chat.messages.AssistantMessage;

@ExtendWith(MockitoExtension.class)
class AiChatHistoryServiceTest {

    @Mock
    private JdbcChatMemoryRepository chatMemoryRepository;

    @Mock
    private AiChatConversationMapper aiChatConversationMapper;

    @Mock
    private AiChatSuggestionMapper aiChatSuggestionMapper;

    @Mock
    private ResumeService resumeService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private AiChatHistoryService aiChatHistoryService;

    @BeforeEach
    void setUp() {
        aiChatHistoryService = new AiChatHistoryService(
            chatMemoryRepository,
            aiChatConversationMapper,
            aiChatSuggestionMapper,
            resumeService,
            objectMapper
        );
    }

    @Test
    void persistSuggestionPlanKeepsMultipleSuggestionsWithoutDeletingExistingRows() throws Exception {
        AiChatConversationEntity conversation = new AiChatConversationEntity();
        conversation.setConversationId("conv-1");
        conversation.setUserId(7L);
        conversation.setResumeId("resume-1");

        when(aiChatConversationMapper.selectOneByQuery(any())).thenReturn(conversation);
        when(chatMemoryRepository.findByConversationId("conv-1"))
            .thenReturn(List.of(new AssistantMessage("assistant reply")));

        String suggestionJson = """
            {
              "suggestions": [
                {
                  "id": "model-1",
                  "section": "personalSummary",
                  "field": "value",
                  "currentValue": "old summary",
                  "suggestedValue": "new summary",
                  "rationale": "make it sharper"
                },
                {
                  "id": "model-2",
                  "section": "workExperience",
                  "index": 0,
                  "field": "description",
                  "currentValue": "old description",
                  "suggestedValue": "new description",
                  "rationale": "add metrics"
                }
              ]
            }
            """;

        String persisted = aiChatHistoryService.persistSuggestionPlan("resume-1", "conv-1", suggestionJson, 7L);

        ArgumentCaptor<AiChatSuggestionEntity> captor = ArgumentCaptor.forClass(AiChatSuggestionEntity.class);
        verify(aiChatSuggestionMapper, times(2)).insert(captor.capture());
        verify(aiChatSuggestionMapper, never()).deleteById(any());

        List<AiChatSuggestionEntity> inserted = captor.getAllValues();
        assertThat(inserted).hasSize(2);
        assertThat(inserted.get(0).getSuggestionId()).isEqualTo("conv-1-a0-s0");
        assertThat(inserted.get(0).getStatus()).isEqualTo("pending");
        assertThat(inserted.get(1).getSuggestionId()).isEqualTo("conv-1-a0-s1");
        assertThat(inserted.get(1).getStatus()).isEqualTo("pending");

        JsonNode plan = objectMapper.readTree(persisted);
        assertThat(plan.get("suggestions").size()).isEqualTo(2);
        assertThat(plan.get("suggestions").get(0).get("id").asText()).isEqualTo("conv-1-a0-s0");
        assertThat(plan.get("suggestions").get(1).get("id").asText()).isEqualTo("conv-1-a0-s1");
    }
}
