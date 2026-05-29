alter table resume_share_links
    drop constraint if exists resume_share_links_target_version_id_fkey;

comment on column resume_share_links.target_version_id is
    'Snapshot share target version id. May be null for latest shares or invalid when the snapshot was deleted.';
