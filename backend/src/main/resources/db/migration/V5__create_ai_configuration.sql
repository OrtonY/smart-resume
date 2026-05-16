create table if not exists ai_configurations (
    id bigint primary key,
    vendor varchar(40) not null,
    base_url varchar(500) not null,
    api_key varchar(1000) not null,
    model_name varchar(200) not null,
    created_at timestamp not null,
    updated_at timestamp not null
);
