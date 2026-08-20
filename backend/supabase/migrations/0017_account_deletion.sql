-- 0017_account_deletion
-- PRIVACY.md SS5-6 promises "Eliminacion de tu cuenta y tus datos" as a user right, but until now
-- the only way to exercise it was emailing the operator - no self-service path existed anywhere
-- in frontend/src/features/auth. This closes that gap with a single security-definer RPC.
--
-- Every user-data table already declares `references auth.users(id) on delete cascade`
-- (profiles, routines, routine_tasks, routine_task_events, reminder_preferences, app_events), so
-- deleting the auth.users row is sufficient on its own - Postgres cascades the rest. Supabase's
-- own auth schema (identities, sessions, refresh_tokens, etc.) cascades off auth.users the same
-- way, so this also fully signs the user out everywhere as a side effect.
--
-- Requires the role running this migration to hold DELETE on auth.users (true for the `postgres`
-- role Supabase migrations run as). Scoped to auth.uid() only - a user can only ever delete their
-- own account, never anyone else's, and there is no way to pass another user's id in.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_own_account() to authenticated;

insert into public.nr_schema_meta (id, version)
values (1, 17)
on conflict (id) do update set
  version = excluded.version,
  updated_at = now();
