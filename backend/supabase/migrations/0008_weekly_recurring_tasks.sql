-- 0008_weekly_recurring_tasks
-- Extends ADR-008's daily-recurring engine with an optional per-task weekly cadence, closing
-- the gap that ADR itself called out and deliberately postponed ("Recurrence is daily-only for
-- v1 (no per-weekday cadence at the task level)").
--
-- `recurrence_days_of_week` is nullable/empty on purpose: null or '{}' means "every day", the
-- exact behavior every existing recurring task already has, so this migration changes nothing
-- for them. A non-empty array (0=Sun..6=Sat, matching JS Date#getDay()) restricts the daily
-- reset to only fire on those weekdays; on a day that isn't selected, the task is left alone
-- rather than force-reset, so a habit picked for Mon/Wed/Fri doesn't get silently unchecked on
-- a Tuesday. See docs/adr/ADR-011-weekly-recurring-tasks.md.

alter table public.routine_tasks
  add column if not exists recurrence_days_of_week smallint[];

alter table public.routine_tasks
  drop constraint if exists routine_tasks_recurrence_days_valid;

alter table public.routine_tasks
  add constraint routine_tasks_recurrence_days_valid
  check (
    recurrence_days_of_week is null
    or recurrence_days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  );

create or replace function public.reset_recurring_tasks(p_today date)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_dow smallint := extract(dow from p_today)::smallint; -- 0=Sun..6=Sat, matches JS Date#getDay()
begin
  perform set_config('app.bypass_task_event', 'true', true);

  update public.routine_tasks
  set is_done = false
  where user_id = auth.uid()
    and is_recurring = true
    and is_done = true
    and (completed_at is null or completed_at::date <> p_today)
    and (
      recurrence_days_of_week is null
      or cardinality(recurrence_days_of_week) = 0
      or v_dow = any(recurrence_days_of_week)
    );
end;
$$;

grant execute on function public.reset_recurring_tasks(date) to authenticated;

insert into public.nr_schema_meta (id, version)
values (1, 8)
on conflict (id) do update set
  version = excluded.version,
  updated_at = now();
