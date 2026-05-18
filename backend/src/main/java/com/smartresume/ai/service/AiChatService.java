package com.smartresume.ai.service;

import com.smartresume.ai.dto.AiDtos.AiChatEvent;
import com.smartresume.ai.dto.AiInvocationRequest;
import reactor.core.publisher.Flux;

public interface AiChatService {

    Flux<AiChatEvent> stream(AiInvocationRequest request);

    String call(AiInvocationRequest request);

    <T> T callStructured(AiInvocationRequest request, Class<T> responseType);
}
