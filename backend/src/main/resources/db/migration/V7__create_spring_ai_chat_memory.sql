create table if not exists SPRING_AI_CHAT_MEMORY (
    conversation_id varchar(128) not null,
    content text not null,
    type varchar(10) not null check (type in ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL')),
    "timestamp" timestamp not null
);

create index if not exists SPRING_AI_CHAT_MEMORY_CONVERSATION_ID_TIMESTAMP_IDX
    on SPRING_AI_CHAT_MEMORY (conversation_id, "timestamp");
