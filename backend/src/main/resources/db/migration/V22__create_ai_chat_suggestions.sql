create table if not exists ai_chat_suggestions (
    id bigserial primary key,
    user_id bigint not null,
    resume_id varchar(64) not null,
    conversation_id varchar(128) not null,
    assistant_message_index integer not null,
    display_order integer not null,
    suggestion_id varchar(200) not null,
    section varchar(64) not null,
    section_index integer null,
    field varchar(64) not null,
    current_value text null,
    suggested_value text not null,
    rationale text not null,
    status varchar(16) not null,
    created_at timestamp not null,
    updated_at timestamp not null
);

create unique index if not exists uk_ai_chat_suggestions_user_conversation_suggestion
    on ai_chat_suggestions (user_id, conversation_id, suggestion_id);

create index if not exists idx_ai_chat_suggestions_user_conversation_order
    on ai_chat_suggestions (user_id, conversation_id, assistant_message_index, display_order);
