create table if not exists system_credentials (
    id bigint primary key,
    password_hash varchar(255) not null,
    created_at timestamp not null,
    updated_at timestamp not null
);

create table if not exists resumes (
    id varchar(64) primary key,
    title varchar(200) not null,
    template_key varchar(80) not null,
    deleted boolean not null default false,
    created_at timestamp not null,
    updated_at timestamp not null,
    deleted_at timestamp null
);

create table if not exists resume_sections (
    id varchar(64) primary key,
    resume_id varchar(64) not null references resumes(id),
    section_type varchar(80) not null,
    sort_order integer not null,
    content_json text not null,
    created_at timestamp not null,
    updated_at timestamp not null,
    constraint uk_resume_sections_resume_type unique (resume_id, section_type)
);

create table if not exists resume_versions (
    id varchar(64) primary key,
    resume_id varchar(64) not null references resumes(id),
    version_number integer not null,
    title varchar(200) not null,
    template_key varchar(80) not null,
    content_json text not null,
    created_at timestamp not null,
    constraint uk_resume_versions_resume_version unique (resume_id, version_number)
);

create table if not exists resume_share_links (
    id varchar(64) primary key,
    resume_id varchar(64) not null references resumes(id),
    share_code varchar(80) not null unique,
    share_mode varchar(20) not null,
    target_version_id varchar(64) null references resume_versions(id),
    active boolean not null default true,
    created_at timestamp not null,
    updated_at timestamp not null
);

create index if not exists idx_resumes_deleted on resumes (deleted, updated_at);
create index if not exists idx_resume_sections_resume_id on resume_sections (resume_id);
create index if not exists idx_resume_share_links_resume_id on resume_share_links (resume_id);
