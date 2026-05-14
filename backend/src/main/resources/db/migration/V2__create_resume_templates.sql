create table if not exists resume_templates (
    key varchar(80) primary key,
    name varchar(120) not null,
    summary varchar(500) not null,
    category varchar(120) not null,
    layout varchar(40) not null,
    theme_json text not null,
    preview_json text not null,
    built_in boolean not null default false,
    deleted boolean not null default false,
    created_at timestamp not null,
    updated_at timestamp not null,
    deleted_at timestamp null
);

create index if not exists idx_resume_templates_deleted on resume_templates (deleted, updated_at);
create index if not exists idx_resume_templates_built_in on resume_templates (built_in, deleted);
