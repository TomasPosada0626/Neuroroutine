-- 0014_add_user_id_indexes
-- Every RLS policy on routines and routine_tasks filters by `auth.uid() = user_id`, and
-- routine_tasks is additionally joined/filtered by routine_id on nearly every dashboard/routines
-- query - but none of the 13 prior migrations ever indexed these columns. Postgres has been doing
-- a full table scan under RLS for the single most common access pattern in the app on every
-- dashboard load and routine list. Purely additive: CREATE INDEX only, no data/behavior change.

create index if not exists routines_user_id_idx on public.routines (user_id);
create index if not exists routine_tasks_user_id_idx on public.routine_tasks (user_id);
create index if not exists routine_tasks_routine_id_idx on public.routine_tasks (routine_id);

insert into public.nr_schema_meta (id, version)
values (1, 14)
on conflict (id) do update set
  version = excluded.version,
  updated_at = now();
