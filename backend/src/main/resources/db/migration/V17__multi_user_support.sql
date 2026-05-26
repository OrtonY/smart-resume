create table if not exists users (
    id bigserial primary key,
    username varchar(80) not null unique,
    password_hash varchar(255) not null,
    admin boolean not null default false,
    created_at timestamp not null,
    updated_at timestamp not null
);

create table if not exists system_settings (
    id bigint primary key,
    registration_enabled boolean not null default true,
    created_at timestamp not null,
    updated_at timestamp not null
);

insert into system_settings (id, registration_enabled, created_at, updated_at)
select 1, true, current_timestamp, current_timestamp
where not exists (select 1 from system_settings where id = 1);

insert into users (id, username, password_hash, admin, created_at, updated_at)
select 1, 'admin', credential.password_hash, true, credential.created_at, credential.updated_at
from (
    select password_hash, created_at, updated_at
    from system_credentials
    order by updated_at desc
    limit 1
) credential
where not exists (select 1 from users where id = 1)
  and not exists (select 1 from users where username = 'admin');

select setval(pg_get_serial_sequence('users', 'id'), (select max(id) from users), true)
where exists (select 1 from users);

alter table resumes add column if not exists user_id bigint;
alter table resume_sections add column if not exists user_id bigint;
alter table resume_versions add column if not exists user_id bigint;
alter table resume_share_links add column if not exists user_id bigint;
alter table share_access_logs add column if not exists user_id bigint;
alter table ai_configurations add column if not exists user_id bigint;
alter table ai_chat_messages add column if not exists user_id bigint;
alter table ai_chat_conversations add column if not exists user_id bigint;
alter table interview_sessions add column if not exists user_id bigint;
alter table interview_messages add column if not exists user_id bigint;
alter table interview_round_topics add column if not exists user_id bigint;
alter table resume_templates add column if not exists user_id bigint;

update resumes
set user_id = 1
where user_id is null;

update resume_sections sections
set user_id = resumes.user_id
from resumes
where sections.resume_id = resumes.id
  and sections.user_id is null;

update resume_versions versions
set user_id = resumes.user_id
from resumes
where versions.resume_id = resumes.id
  and versions.user_id is null;

update resume_share_links shares
set user_id = resumes.user_id
from resumes
where shares.resume_id = resumes.id
  and shares.user_id is null;

update share_access_logs logs
set user_id = shares.user_id
from resume_share_links shares
where logs.share_id = shares.id
  and logs.user_id is null;

update ai_configurations
set user_id = 1
where user_id is null;

update ai_chat_messages messages
set user_id = resumes.user_id
from resumes
where messages.resume_id = resumes.id
  and messages.user_id is null;

update ai_chat_conversations conversations
set user_id = resumes.user_id
from resumes
where conversations.resume_id = resumes.id
  and conversations.user_id is null;

update interview_sessions sessions
set user_id = coalesce(resumes.user_id, 1)
from resumes
where sessions.resume_id = resumes.id
  and sessions.user_id is null;

update interview_sessions
set user_id = 1
where user_id is null;

update interview_messages messages
set user_id = sessions.user_id
from interview_sessions sessions
where messages.session_id = sessions.id
  and messages.user_id is null;

update interview_round_topics topics
set user_id = sessions.user_id
from interview_sessions sessions
where topics.session_id = sessions.id
  and topics.user_id is null;

update resume_templates
set user_id = 1
where user_id is null
  and coalesce(built_in, false) = false;

alter table resumes alter column user_id set not null;
alter table resume_sections alter column user_id set not null;
alter table resume_versions alter column user_id set not null;
alter table resume_share_links alter column user_id set not null;
alter table share_access_logs alter column user_id set not null;
alter table ai_configurations alter column user_id set not null;
alter table ai_chat_messages alter column user_id set not null;
alter table ai_chat_conversations alter column user_id set not null;
alter table interview_sessions alter column user_id set not null;
alter table interview_messages alter column user_id set not null;
alter table interview_round_topics alter column user_id set not null;

create unique index if not exists uk_ai_configurations_user_id on ai_configurations (user_id);

create index if not exists idx_resumes_user_updated on resumes (user_id, updated_at desc);
create index if not exists idx_resume_sections_user_resume on resume_sections (user_id, resume_id);
create index if not exists idx_resume_versions_user_resume on resume_versions (user_id, resume_id, version_number desc);
create index if not exists idx_resume_share_links_user_resume on resume_share_links (user_id, resume_id, created_at desc);
create index if not exists idx_share_access_logs_user_share on share_access_logs (user_id, share_id, accessed_at desc);
create index if not exists idx_ai_chat_messages_user_resume on ai_chat_messages (user_id, resume_id, created_at desc, id);
create index if not exists idx_ai_chat_conversations_user_resume_updated
    on ai_chat_conversations (user_id, resume_id, updated_at desc);
create index if not exists idx_interview_sessions_user_updated on interview_sessions (user_id, updated_at desc);
create index if not exists idx_interview_messages_user_session on interview_messages (user_id, session_id, sort_order);
create index if not exists idx_interview_round_topics_user_session on interview_round_topics (user_id, session_id, round_index);
create index if not exists idx_resume_templates_user_updated on resume_templates (user_id, updated_at desc);
