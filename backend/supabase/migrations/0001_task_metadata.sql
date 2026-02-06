-- 0001_task_metadata
-- Adds optional task metadata (safe to re-run).

alter table public.routine_tasks
  add column if not exists description text;

alter table public.routine_tasks
  add column if not exists due_date date;

alter table public.routine_tasks
  add column if not exists due_time time;
