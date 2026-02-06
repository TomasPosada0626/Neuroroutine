-- 0003_schema_status
-- Lightweight schema version + capability check for the frontend.

create table if not exists public.nr_schema_meta (
  id int primary key,
  version int not null,
  updated_at timestamptz not null default now()
);

insert into public.nr_schema_meta (id, version)
values (1, 3)
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

  has_app_events := to_regclass('public.app_events') is not null;

  return jsonb_build_object(
    'version', v_version,
    'task_metadata', jsonb_build_object(
      'description', has_description,
      'due_date', has_due_date,
      'due_time', has_due_time
    ),
    'has_app_events', has_app_events
  );
end;
$$;

grant execute on function public.get_nr_schema_status() to anon, authenticated;
