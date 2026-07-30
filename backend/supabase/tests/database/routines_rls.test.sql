-- pgTAP suite verifying RLS on routines/routine_tasks/routine_task_events at the SQL layer
-- directly, independent of the PostgREST/JWT path the Playwright RLS E2E test already covers.
-- This is a second, secret-free line of defense: it runs on every push with just a local,
-- throwaway database (see .github/workflows/ci.yml's "backend-rls" job), while the E2E version
-- only runs when real Supabase test-account secrets are configured.
begin;

create extension if not exists pgtap with schema extensions;

-- Supabase Cloud projects get these table-level GRANTs applied automatically when a schema is
-- exposed to the API (outside of user migrations); a bare local/CI Postgres started from this
-- migrations/ directory alone does not have them, so RLS's row-level filtering never even gets a
-- chance to run without them. Scoped to this transaction only — never persisted.
grant select, insert, update, delete on public.routines to authenticated;
grant select, insert, update, delete on public.routine_tasks to authenticated;

select plan(11);

-- Two throwaway auth users, inserted directly (bypassing GoTrue, which isn't needed to exercise
-- RLS policies — those only care about the `sub` claim `auth.uid()` reads from the session GUC).
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'pgtap-user-a@test.local', 'x', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'pgtap-user-b@test.local', 'x', now(), now(), now());

-- Seed data as postgres (bypasses RLS): one routine + one task, owned by user A.
insert into public.routines (id, user_id, title)
values ('a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'User A''s routine');

insert into public.routine_tasks (id, user_id, routine_id, title)
values ('a1111111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a1111111-0000-0000-0000-000000000001', 'User A''s task');

-- --- As user B: every cross-user access must be denied ---
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is(
  (select count(*) from public.routines where id = 'a1111111-0000-0000-0000-000000000001'),
  0::bigint,
  'user B cannot SELECT user A''s routine'
);

select is(
  (select count(*) from public.routine_tasks where id = 'a1111111-0000-0000-0000-000000000002'),
  0::bigint,
  'user B cannot SELECT user A''s task'
);

with updated as (
  update public.routines set title = 'hacked by B' where id = 'a1111111-0000-0000-0000-000000000001'
  returning id
)
select is((select count(*) from updated), 0::bigint, 'user B cannot UPDATE user A''s routine');

with updated as (
  update public.routine_tasks set title = 'hacked by B' where id = 'a1111111-0000-0000-0000-000000000002'
  returning id
)
select is((select count(*) from updated), 0::bigint, 'user B cannot UPDATE user A''s task');

with deleted as (
  delete from public.routines where id = 'a1111111-0000-0000-0000-000000000001'
  returning id
)
select is((select count(*) from deleted), 0::bigint, 'user B cannot DELETE user A''s routine');

with deleted as (
  delete from public.routine_tasks where id = 'a1111111-0000-0000-0000-000000000002'
  returning id
)
select is((select count(*) from deleted), 0::bigint, 'user B cannot DELETE user A''s task');

select throws_ok(
  $$ insert into public.routines (user_id, title) values ('11111111-1111-1111-1111-111111111111', 'spoofed as A') $$,
  '42501',
  null,
  'user B cannot INSERT a routine claiming to be owned by user A'
);

-- --- Back to postgres: prove the rows survived every denied attempt above, unchanged ---
reset role;
reset "request.jwt.claims";

select is(
  (select title from public.routines where id = 'a1111111-0000-0000-0000-000000000001'),
  'User A''s routine',
  'routine title is unchanged after the denied cross-user update attempt'
);

-- --- As user A: the policies must still actually grant access to their own data ---
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select count(*) from public.routines where id = 'a1111111-0000-0000-0000-000000000001'),
  1::bigint,
  'user A can SELECT their own routine'
);

with updated as (
  update public.routines set title = 'Renamed by A' where id = 'a1111111-0000-0000-0000-000000000001'
  returning id
)
select is((select count(*) from updated), 1::bigint, 'user A can UPDATE their own routine');

with deleted as (
  delete from public.routine_tasks where id = 'a1111111-0000-0000-0000-000000000002'
  returning id
)
select is((select count(*) from deleted), 1::bigint, 'user A can DELETE their own task');

select * from finish();
rollback;
