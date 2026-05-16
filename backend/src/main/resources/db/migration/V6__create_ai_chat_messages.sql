create table if not exists ai_chat_messages (
    id bigserial primary key,
    resume_id varchar(64) not null,
    role varchar(20) not null,
    content text not null,
    created_at timestamp not null
);

create index if not exists idx_ai_chat_messages_resume_id_created_at
    on ai_chat_messages (resume_id, created_at, id);
