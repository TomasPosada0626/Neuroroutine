-- 0011_lock_down_schema_meta_table
-- nr_schema_meta was the only table in this schema without `enable row level security`, an
-- inconsistency an architecture audit flagged against this project's own RLS-first practice
-- (every other table has it). It doesn't need any direct client access at all: the frontend
-- only ever reads schema state through get_nr_schema_status(), a `security definer` function
-- that runs as the table owner and is unaffected by RLS on the underlying table. Enabling RLS
-- here with zero policies fully closes direct anon/authenticated access (select/insert/
-- update/delete) while leaving that function working exactly as before.

alter table public.nr_schema_meta enable row level security;

insert into public.nr_schema_meta (id, version)
values (1, 11)
on conflict (id) do update set
  version = excluded.version,
  updated_at = now();
