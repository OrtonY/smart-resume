alter table interview_messages
    add column if not exists status varchar(20) not null default 'NORMAL';
