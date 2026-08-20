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
grant select, insert, update, delete on public.routine_task_events to authenticated;
grant select, insert, update, delete on public.reminder_preferences to authenticated;
grant select, insert, update, delete on public.app_events to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;

select plan(28);

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

-- Seed one row per remaining RLS-protected table, all owned by user A. profiles rows for both
-- users already exist via the on_auth_user_created trigger fired by the auth.users inserts above.
insert into public.routine_task_events (id, user_id, routine_id, routine_task_id, event_type)
values ('a1111111-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'a1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000002', 'completed');

-- reminder_preferences is seeded further below, AFTER the insert-spoof test for it: that test
-- needs no row to exist yet for user A, or a conflict on the user_id primary key would throw
-- unique_violation (23505) instead of the RLS violation (42501) the test asserts.

insert into public.app_events (id, user_id, event_name)
values ('a1111111-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'test_event');

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

-- --- routine_task_events: analytics log feeding streak calculations, so cross-user tampering
-- --- would corrupt another user's consistency data, not just leak it.
select is(
  (select count(*) from public.routine_task_events where id = 'a1111111-0000-0000-0000-000000000003'),
  0::bigint,
  'user B cannot SELECT user A''s routine_task_event'
);

select throws_ok(
  $$ insert into public.routine_task_events (user_id, routine_id, routine_task_id, event_type)
     values ('11111111-1111-1111-1111-111111111111', 'a1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000002', 'completed') $$,
  '42501',
  null,
  'user B cannot INSERT a routine_task_event claiming to be owned by user A'
);

-- --- reminder_preferences: insert-spoof test runs first, before any row exists for user A, so
-- --- the primary key (user_id) can't conflict and mask the RLS check behind the wrong error.
select throws_ok(
  $$ insert into public.reminder_preferences (user_id, email_enabled) values ('11111111-1111-1111-1111-111111111111', true) $$,
  '42501',
  null,
  'user B cannot INSERT reminder_preferences claiming to be owned by user A'
);

-- Seed user A's row now (as postgres, bypassing RLS), then resume as user B for the
-- select/update/delete-deny checks below, which need a real row to prove they're filtering it.
reset role;
reset "request.jwt.claims";
insert into public.reminder_preferences (user_id, email_enabled, reminder_hour, timezone)
values ('11111111-1111-1111-1111-111111111111', true, 8, 'UTC');
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

-- --- leaking this cross-user would expose another user's email schedule; writing it would let
-- --- one user silence or redirect another user's reminders.
select is(
  (select count(*) from public.reminder_preferences where user_id = '11111111-1111-1111-1111-111111111111'),
  0::bigint,
  'user B cannot SELECT user A''s reminder_preferences'
);

with updated as (
  update public.reminder_preferences set email_enabled = false
  where user_id = '11111111-1111-1111-1111-111111111111'
  returning user_id
)
select is((select count(*) from updated), 0::bigint, 'user B cannot UPDATE user A''s reminder_preferences');

with deleted as (
  delete from public.reminder_preferences where user_id = '11111111-1111-1111-1111-111111111111'
  returning user_id
)
select is((select count(*) from deleted), 0::bigint, 'user B cannot DELETE user A''s reminder_preferences');

-- --- app_events: the product event log; cross-user read/write is a privacy and integrity leak.
select is(
  (select count(*) from public.app_events where id = 'a1111111-0000-0000-0000-000000000004'),
  0::bigint,
  'user B cannot SELECT user A''s app_event'
);

select throws_ok(
  $$ insert into public.app_events (user_id, event_name) values ('11111111-1111-1111-1111-111111111111', 'spoofed') $$,
  '42501',
  null,
  'user B cannot INSERT an app_event claiming to be owned by user A'
);

-- --- profiles: cross-user read exposes email/username; cross-user write lets one account
-- --- rewrite another user's identity (e.g. hijack the username used for login lookup).
select is(
  (select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  0::bigint,
  'user B cannot SELECT user A''s profile'
);

with updated as (
  update public.profiles set username = 'hacked-by-b'
  where id = '11111111-1111-1111-1111-111111111111'
  returning id
)
select is((select count(*) from updated), 0::bigint, 'user B cannot UPDATE user A''s profile');

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

select is(
  (select count(*) from public.reminder_preferences where user_id = '11111111-1111-1111-1111-111111111111'),
  1::bigint,
  'user A can SELECT their own reminder_preferences'
);

select is(
  (select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  1::bigint,
  'user A can SELECT their own profile'
);

-- routine_task_events has no UPDATE policy at all (append-only audit trail by design): even the
-- owner cannot edit history after the fact, which matters here because it's what streak/
-- consistency calculations are computed from.
with updated as (
  update public.routine_task_events set event_type = 'uncompleted'
  where id = 'a1111111-0000-0000-0000-000000000003'
  returning id
)
select is((select count(*) from updated), 0::bigint, 'even user A cannot UPDATE a routine_task_event (append-only)');

with deleted as (
  delete from public.routine_tasks where id = 'a1111111-0000-0000-0000-000000000002'
  returning id
)
select is((select count(*) from deleted), 1::bigint, 'user A can DELETE their own task');

-- --- delete_own_account (migration 0017): scoped to auth.uid() only, must never touch another
-- --- user's data. Run last, near the end since it's destructive to user B's rows.
reset role;
reset "request.jwt.claims";

select throws_ok(
  $$ select public.delete_own_account() $$,
  '28000',
  'Not authenticated',
  'delete_own_account rejects an unauthenticated caller'
);

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select lives_ok(
  $$ select public.delete_own_account() $$,
  'user B can delete their own account'
);

select is(
  (select count(*) from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'user B''s profile is gone after deleting their own account (cascade from auth.users)'
);

reset role;
reset "request.jwt.claims";

select is(
  (select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  1::bigint,
  'user A''s profile is untouched by user B deleting their own account'
);

select * from finish();
rollback;
