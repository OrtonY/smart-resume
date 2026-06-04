create table if not exists interview_question_banks (
    id varchar(64) primary key,
    user_id bigint not null references users(id),
    name varchar(200) not null,
    description text null,
    tags_json text not null default '[]',
    created_at timestamp not null,
    updated_at timestamp not null
);

create table if not exists interview_questions (
    id varchar(64) primary key,
    user_id bigint not null references users(id),
    question_bank_id varchar(64) not null references interview_question_banks(id) on delete cascade,
    question text not null,
    difficulty varchar(20) not null,
    tags_json text not null default '[]',
    focus_points text null,
    created_at timestamp not null,
    updated_at timestamp not null
);

alter table interview_sessions
    add column question_bank_id varchar(64) null;

alter table interview_sessions
    add column question_bank_tags_json text not null default '[]';

alter table interview_sessions
    add column question_bank_relevance varchar(20) null;

create index if not exists idx_interview_question_banks_user_updated
    on interview_question_banks (user_id, updated_at desc);

create index if not exists idx_interview_questions_user_bank_updated
    on interview_questions (user_id, question_bank_id, updated_at desc);

create index if not exists idx_interview_sessions_question_bank
    on interview_sessions (user_id, question_bank_id);
