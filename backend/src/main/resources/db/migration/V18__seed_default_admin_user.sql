insert into users (id, username, password_hash, admin, created_at, updated_at)
select
    1,
    'admin',
    '$2a$10$Mg6sZUZsPpFBjDIckK5Z2.BXwLlHgimSfLjOV9S6rvYoA8cZsq0ci',
    true,
    current_timestamp,
    current_timestamp
where not exists (select 1 from users);

select setval(pg_get_serial_sequence('users', 'id'), (select max(id) from users), true)
where exists (select 1 from users);
