create table if not exists job_applications (
    id varchar(64) primary key,
    user_id bigint not null,
    resume_id varchar(64) null references resumes(id) on delete set null,
    company varchar(255) not null,
    position varchar(255) not null,
    channel varchar(64) null,
    status varchar(32) not null,
    applied_at timestamp not null,
    notes text null,
    created_at timestamp not null,
    updated_at timestamp not null
);

create index if not exists idx_job_applications_user_applied
    on job_applications (user_id, applied_at desc);

create index if not exists idx_job_applications_resume
    on job_applications (resume_id);
