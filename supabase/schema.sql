create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_api_keys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null default 'default',
  key_hash text not null unique,
  key_prefix text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  channel text not null,
  title text not null,
  description text,
  icon text,
  tags text[] not null default '{}',
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists events_project_occurred_idx
  on public.events (project_id, occurred_at desc);

create index if not exists events_project_channel_idx
  on public.events (project_id, channel, occurred_at desc);

create index if not exists events_tags_idx
  on public.events using gin (tags);

create index if not exists events_search_idx
  on public.events
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));

alter table public.projects enable row level security;
alter table public.events enable row level security;
alter table public.project_api_keys enable row level security;

drop policy if exists "Public can read projects" on public.projects;
create policy "Public can read projects"
  on public.projects
  for select
  to anon
  using (true);

drop policy if exists "Public can read events" on public.events;
create policy "Public can read events"
  on public.events
  for select
  to anon
  using (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'events'
  ) then
    execute 'alter publication supabase_realtime add table public.events';
  end if;
end $$;
