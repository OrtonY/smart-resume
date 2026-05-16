-- Add password protection to share links and create access log table

alter table resume_share_links add column password_hash varchar(200) null;

create table if not exists share_access_logs (
    id varchar(64) primary key,
    share_id varchar(64) not null references resume_share_links(id),
    accessed_at timestamp not null,
    ip_address varchar(45) not null
);

create index idx_share_access_logs_share_id on share_access_logs(share_id);
