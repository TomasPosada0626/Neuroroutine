-- NeuroRoutine schema (Supabase Postgres)

create extension if not exists "pgcrypto";

-- Profiles (user info)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text not null,
  first_name text,
  last_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_unique on public.profiles (lower(username));

-- Create profile automatically when a new auth user is created.
-- This is required when email confirmation is enabled (no session on signUp),
-- so the frontend cannot insert into profiles via RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := coalesce(new.raw_user_meta_data->>'username', 'user_' || left(new.id::text, 8));

  insert into public.profiles (id, email, username, first_name, last_name)
  values (
    new.id,
    new.email,
    v_username,
    nullif(new.raw_user_meta_data->>'first_name', ''),
    nullif(new.raw_user_meta_data->>'last_name', '')
  )
  on conflict (id) do update
    set
      email = excluded.email,
      username = excluded.username,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Routines
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tasks inside a routine
create table if not exists public.routine_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill-friendly change: store last completion timestamp
alter table public.routine_tasks
  add column if not exists completed_at timestamptz;

-- Task details: optional description and scheduling
alter table public.routine_tasks
  add column if not exists description text;

alter table public.routine_tasks
  add column if not exists due_date date;

alter table public.routine_tasks
  add column if not exists due_time time;

-- Daily-recurring tasks: is_done means "done today"; reset_recurring_tasks() (below) clears it
-- once a new day starts instead of leaving a habit permanently checked off.
alter table public.routine_tasks
  add column if not exists is_recurring boolean not null default false;

-- Analytics-grade history: task completion events
create table if not exists public.routine_task_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  routine_task_id uuid not null references public.routine_tasks(id) on delete cascade,
  event_type text not null,
  created_at timestamptz not null default now(),
  constraint routine_task_events_event_type_check check (event_type in ('completed', 'uncompleted'))
);

create index if not exists routine_task_events_user_created_idx
  on public.routine_task_events (user_id, created_at desc);

create index if not exists routine_task_events_task_created_idx
  on public.routine_task_events (routine_task_id, created_at desc);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Keep completed_at consistent and write analytics events when is_done changes.
-- The bypass flag lets reset_recurring_tasks() (below) flip a habit back to "not done today"
-- without logging a fake "uncompleted" event / reopen: only user-driven toggles set no flag,
-- so their events are recorded as before.
create or replace function public.handle_task_completion()
returns trigger
language plpgsql
as $$
begin
  if new.is_done is distinct from old.is_done then
    if new.is_done then
      new.completed_at = coalesce(new.completed_at, now());
      if coalesce(current_setting('app.bypass_task_event', true), '') <> 'true' then
        insert into public.routine_task_events (user_id, routine_id, routine_task_id, event_type)
        values (new.user_id, new.routine_id, new.id, 'completed');
      end if;
    else
      new.completed_at = null;
      if coalesce(current_setting('app.bypass_task_event', true), '') <> 'true' then
        insert into public.routine_task_events (user_id, routine_id, routine_task_id, event_type)
        values (new.user_id, new.routine_id, new.id, 'uncompleted');
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- Resets recurring tasks completed on a previous day so the checkbox is fresh again "today".
-- p_today is the CALLER's local calendar date (the frontend computes it from the browser
-- clock): completion timestamps are wall-clock, so a server-side UTC "today" would resolve
-- the day boundary incorrectly for users outside UTC.
create or replace function public.reset_recurring_tasks(p_today date)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.bypass_task_event', 'true', true);

  update public.routine_tasks
  set is_done = false
  where user_id = auth.uid()
    and is_recurring = true
    and is_done = true
    and (completed_at is null or completed_at::date <> p_today);
end;
$$;

grant execute on function public.reset_recurring_tasks(date) to authenticated;

drop trigger if exists routines_set_updated_at on public.routines;
create trigger routines_set_updated_at
before update on public.routines
for each row execute function public.set_updated_at();

drop trigger if exists routine_tasks_set_updated_at on public.routine_tasks;
create trigger routine_tasks_set_updated_at
before update on public.routine_tasks
for each row execute function public.set_updated_at();

drop trigger if exists routine_tasks_handle_completion on public.routine_tasks;
create trigger routine_tasks_handle_completion
before update on public.routine_tasks
for each row execute function public.handle_task_completion();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- RLS
alter table public.routines enable row level security;
alter table public.routine_tasks enable row level security;
alter table public.routine_task_events enable row level security;
alter table public.profiles enable row level security;

-- Policies: routines
drop policy if exists "routines_select_own" on public.routines;
create policy "routines_select_own" on public.routines
for select using (auth.uid() = user_id);

drop policy if exists "routines_insert_own" on public.routines;
create policy "routines_insert_own" on public.routines
for insert with check (auth.uid() = user_id);

drop policy if exists "routines_update_own" on public.routines;
create policy "routines_update_own" on public.routines
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "routines_delete_own" on public.routines;
create policy "routines_delete_own" on public.routines
for delete using (auth.uid() = user_id);

-- Policies: routine_tasks
drop policy if exists "routine_tasks_select_own" on public.routine_tasks;
create policy "routine_tasks_select_own" on public.routine_tasks
for select using (auth.uid() = user_id);

drop policy if exists "routine_tasks_insert_own" on public.routine_tasks;
create policy "routine_tasks_insert_own" on public.routine_tasks
for insert with check (auth.uid() = user_id);

drop policy if exists "routine_tasks_update_own" on public.routine_tasks;
create policy "routine_tasks_update_own" on public.routine_tasks
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "routine_tasks_delete_own" on public.routine_tasks;
create policy "routine_tasks_delete_own" on public.routine_tasks
for delete using (auth.uid() = user_id);

-- Policies: routine_task_events
drop policy if exists "routine_task_events_select_own" on public.routine_task_events;
create policy "routine_task_events_select_own" on public.routine_task_events
for select using (auth.uid() = user_id);

drop policy if exists "routine_task_events_insert_own" on public.routine_task_events;
create policy "routine_task_events_insert_own" on public.routine_task_events
for insert with check (auth.uid() = user_id);

-- Policies: profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

-- Username login helper (returns the email for a username)
-- Note: this enables username->email lookup. Keep username choices non-sensitive.
create or replace function public.get_email_by_username(u text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.email
  from public.profiles p
  where lower(p.username) = lower(u)
  limit 1;
$$;

grant execute on function public.get_email_by_username(text) to anon, authenticated;

-- Full-text search support for routine titles.
create index if not exists routines_title_fts_idx
  on public.routines
  using gin (to_tsvector('spanish', coalesce(title, '')));

create or replace function public.search_routines(
  p_query text,
  p_limit integer default 50
)
returns setof public.routines
language sql
stable
security invoker
set search_path = public
as $$
  select r.*
  from public.routines r
  where r.user_id = auth.uid()
    and (
      p_query is null
      or btrim(p_query) = ''
      or to_tsvector('spanish', coalesce(r.title, '')) @@ websearch_to_tsquery('spanish', p_query)
    )
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

grant execute on function public.search_routines(text, integer) to authenticated;

-- Reminder preferences for daily due-task notifications.
create table if not exists public.reminder_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean not null default true,
  push_enabled boolean not null default false,
  reminder_hour smallint not null default 8,
  timezone text not null default 'UTC',
  updated_at timestamptz not null default now(),
  constraint reminder_hour_range check (reminder_hour between 0 and 23)
);

alter table public.reminder_preferences enable row level security;

drop policy if exists "reminder_preferences_select_own" on public.reminder_preferences;
create policy "reminder_preferences_select_own" on public.reminder_preferences
for select using (auth.uid() = user_id);

drop policy if exists "reminder_preferences_upsert_own" on public.reminder_preferences;
create policy "reminder_preferences_upsert_own" on public.reminder_preferences
for insert with check (auth.uid() = user_id);

drop policy if exists "reminder_preferences_update_own" on public.reminder_preferences;
create policy "reminder_preferences_update_own" on public.reminder_preferences
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reminder_preferences_delete_own" on public.reminder_preferences;
create policy "reminder_preferences_delete_own" on public.reminder_preferences
for delete using (auth.uid() = user_id);

-- Minimal (no-PII) product event log
create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null,
  routine_id uuid references public.routines(id) on delete set null,
  routine_task_id uuid references public.routine_tasks(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists app_events_user_created_idx
  on public.app_events (user_id, created_at desc);

alter table public.app_events enable row level security;

drop policy if exists "app_events_select_own" on public.app_events;
create policy "app_events_select_own" on public.app_events
for select using (auth.uid() = user_id);

drop policy if exists "app_events_insert_own" on public.app_events;
create policy "app_events_insert_own" on public.app_events
for insert with check (auth.uid() = user_id);

-- Schema version + capability check (so frontend can warn about missing migrations)
create table if not exists public.nr_schema_meta (
  id int primary key,
  version int not null,
  updated_at timestamptz not null default now()
);

insert into public.nr_schema_meta (id, version)
values (1, 6)
on conflict (id) do update set
  version = excluded.version,
  updated_at = now();

create or replace function public.get_nr_schema_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_version int;
  has_description boolean;
  has_due_date boolean;
  has_due_time boolean;
  has_app_events boolean;
  has_is_recurring boolean;
begin
  select version into v_version from public.nr_schema_meta where id = 1;
  if v_version is null then
    v_version := 0;
  end if;

  select exists(
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'routine_tasks'
      and column_name = 'description'
  ) into has_description;

  select exists(
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'routine_tasks'
      and column_name = 'due_date'
  ) into has_due_date;

  select exists(
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'routine_tasks'
      and column_name = 'due_time'
  ) into has_due_time;

  select exists(
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'routine_tasks'
      and column_name = 'is_recurring'
  ) into has_is_recurring;

  has_app_events := to_regclass('public.app_events') is not null;

  return jsonb_build_object(
    'version', v_version,
    'task_metadata', jsonb_build_object(
      'description', has_description,
      'due_date', has_due_date,
      'due_time', has_due_time,
      'is_recurring', has_is_recurring
    ),
    'has_app_events', has_app_events
  );
end;
$$;

grant execute on function public.get_nr_schema_status() to anon, authenticated;
