create table if not exists interview_sessions (
    id varchar(64) primary key,
    resume_id varchar(64) null references resumes(id),
    title varchar(200) not null,
    ai_conversation_id varchar(128) not null unique,
    job_description text not null,
    difficulty varchar(20) not null,
    interviewer_roles_json text not null,
    active_round_index integer not null default 0,
    status varchar(30) not null,
    report_status varchar(30) not null,
    report_content text null,
    created_at timestamp not null,
    updated_at timestamp not null,
    ended_at timestamp null
);

create table if not exists interview_messages (
    id varchar(64) primary key,
    session_id varchar(64) not null references interview_sessions(id),
    role varchar(30) not null,
    content text not null,
    sort_order integer not null,
    created_at timestamp not null
);

create index if not exists idx_interview_sessions_resume_updated
    on interview_sessions (resume_id, updated_at desc);

create index if not exists idx_interview_sessions_status_updated
    on interview_sessions (status, updated_at desc);

create index if not exists idx_interview_messages_session_order
    on interview_messages (session_id, sort_order);
