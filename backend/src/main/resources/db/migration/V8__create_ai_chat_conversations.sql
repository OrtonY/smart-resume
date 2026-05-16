create table if not exists ai_chat_conversations (
    conversation_id varchar(128) primary key,
    resume_id varchar(64) not null,
    title varchar(160) not null,
    created_at timestamp not null,
    updated_at timestamp not null
);

create index if not exists idx_ai_chat_conversations_resume_id_updated_at
    on ai_chat_conversations (resume_id, updated_at desc);
