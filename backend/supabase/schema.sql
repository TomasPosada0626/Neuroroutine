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

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists routines_set_updated_at on public.routines;
create trigger routines_set_updated_at
before update on public.routines
for each row execute function public.set_updated_at();

drop trigger if exists routine_tasks_set_updated_at on public.routine_tasks;
create trigger routine_tasks_set_updated_at
before update on public.routine_tasks
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- RLS
alter table public.routines enable row level security;
alter table public.routine_tasks enable row level security;
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
