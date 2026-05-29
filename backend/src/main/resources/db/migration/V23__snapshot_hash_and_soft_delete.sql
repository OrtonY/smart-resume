alter table resume_versions
    add column if not exists content_hash varchar(64) null,
    add column if not exists deleted boolean not null default false,
    add column if not exists deleted_at timestamp null;

create index if not exists idx_resume_versions_user_resume_active
    on resume_versions (user_id, resume_id, deleted, version_number desc, created_at desc);
