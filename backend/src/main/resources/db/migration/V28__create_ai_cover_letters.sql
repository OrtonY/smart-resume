create table if not exists ai_cover_letters (
    id varchar(64) primary key,
    user_id bigint not null,
    resume_id varchar(64) not null references resumes(id) on delete cascade,
    application_id varchar(64) null references job_applications(id) on delete set null,
    company varchar(255) not null,
    position varchar(255) not null,
    job_description text null,
    extra_notes text null,
    output_language varchar(64) not null,
    title varchar(255) not null,
    body text not null,
    created_at timestamp not null,
    updated_at timestamp not null
);

create index if not exists idx_ai_cover_letters_user_resume_created
    on ai_cover_letters (user_id, resume_id, created_at desc);

create index if not exists idx_ai_cover_letters_application
    on ai_cover_letters (application_id);
