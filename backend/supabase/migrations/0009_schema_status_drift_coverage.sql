-- 0009_schema_status_drift_coverage
-- get_nr_schema_status() previously had a blind spot for exactly the two things migrations 0007
-- and 0008 added: `rpc_rate_limits` and `routine_tasks.recurrence_days_of_week`. That gap meant
-- the frontend's own drift detector couldn't have warned that those migrations were pending —
-- an audit of this project's production state found both migrations un-applied with no signal
-- anywhere in the app surfacing it. Close that blind spot so the same class of drift can't hide
-- again.

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
  has_recurrence_days boolean;
  has_rate_limit_table boolean;
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

  select exists(
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'routine_tasks'
      and column_name = 'recurrence_days_of_week'
  ) into has_recurrence_days;

  has_app_events := to_regclass('public.app_events') is not null;
  has_rate_limit_table := to_regclass('public.rpc_rate_limits') is not null;

  return jsonb_build_object(
    'version', v_version,
    'task_metadata', jsonb_build_object(
      'description', has_description,
      'due_date', has_due_date,
      'due_time', has_due_time,
      'is_recurring', has_is_recurring,
      'recurrence_days_of_week', has_recurrence_days
    ),
    'has_app_events', has_app_events,
    'has_rate_limit_table', has_rate_limit_table
  );
end;
$$;

grant execute on function public.get_nr_schema_status() to anon, authenticated;

insert into public.nr_schema_meta (id, version)
values (1, 9)
on conflict (id) do update set
  version = excluded.version,
  updated_at = now();
