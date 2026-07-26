-- 0006_recurring_tasks
-- Daily-recurring tasks: a task can repeat every day instead of being a one-off.
-- The "is_done" checkbox on a recurring task means "did you do it today"; a client-triggered
-- reset (reset_recurring_tasks RPC, called once per app load using the user's own local date)
-- flips it back to false once a new calendar day starts, without generating a synthetic
-- "uncompleted" analytics event or a fake "reopen" in the struggle-task scoring.

alter table public.routine_tasks
  add column if not exists is_recurring boolean not null default false;

-- Bypass flag: the completion trigger normally logs an event on every is_done transition.
-- The daily reset is not "the user gave up on the task" — it must not pollute
-- routine_task_events or be counted as a reopen. reset_recurring_tasks() sets this
-- transaction-local setting before its UPDATE; normal user-driven toggles never set it, so
-- their events are recorded exactly as before.
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

-- Schema-status detection: let the frontend warn if this migration hasn't been applied yet.
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
