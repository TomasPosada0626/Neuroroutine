-- 0002_app_events
-- Minimal (no-PII) product analytics/event log.

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
