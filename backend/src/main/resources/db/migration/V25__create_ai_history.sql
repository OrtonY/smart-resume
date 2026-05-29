create table if not exists ai_history (
    id bigserial primary key,
    source_conversation_id varchar(128) not null,
    user_id bigint null,
    resume_id varchar(64) null,
    content text not null,
    type varchar(10) not null,
    source_timestamp timestamp not null,
    archive_reason varchar(40) not null,
    archived_at timestamp not null default current_timestamp
);

create index if not exists idx_ai_history_conversation_archived
    on ai_history (source_conversation_id, archived_at desc);

create index if not exists idx_ai_history_user_resume_archived
    on ai_history (user_id, resume_id, archived_at desc);
