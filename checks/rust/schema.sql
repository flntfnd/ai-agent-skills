-- The one table the skill's sqlx samples query. Compile-time checked macros need it to exist.
create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    display_name text not null,
    created_at timestamptz not null default now()
);
