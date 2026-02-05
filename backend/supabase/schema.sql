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
create or replace function public.handle_task_completion()
returns trigger
language plpgsql
as $$
begin
  if new.is_done is distinct from old.is_done then
    if new.is_done then
      new.completed_at = coalesce(new.completed_at, now());
      insert into public.routine_task_events (user_id, routine_id, routine_task_id, event_type)
      values (new.user_id, new.routine_id, new.id, 'completed');
    else
      new.completed_at = null;
      insert into public.routine_task_events (user_id, routine_id, routine_task_id, event_type)
      values (new.user_id, new.routine_id, new.id, 'uncompleted');
    end if;
  end if;

  return new;
end;
$$;

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
