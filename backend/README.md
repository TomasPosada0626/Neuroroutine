# Backend (Supabase)

This project uses **Supabase** as the real backend (Auth + Postgres) with **RLS** policies so each user can only access their own data.

## Quick setup

1. Create a Supabase project.
2. Open **SQL Editor** and run: `supabase/schema.sql`.
   - Alternative: apply incremental migrations from `supabase/migrations/`.
3. In **Authentication -> Providers**, enable Email (if not enabled).
4. In the frontend, configure variables in `frontend/.env.local` (see `frontend/.env.example`).

## Required Supabase Auth configuration

For production and local OAuth/email flows to work reliably, configure these values in Supabase Authentication URL settings.

- Site URL: your deployed frontend URL (for example `https://neuroroutine.vercel.app`)
- Additional redirect URLs:
   - `https://neuroroutine.vercel.app/app`
   - `https://neuroroutine.vercel.app/login`
   - `http://localhost:5173/app`
   - `http://localhost:5173/login`

## Backend runtime modes

- Supabase cloud (recommended): managed backend, ideal for Vercel or Render deployments.
- Supabase local (optional): run it with Supabase CLI + Docker for full local development.

In both cases, the frontend only needs:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Security

- Tables have **Row Level Security** enabled.
- Policies allow `SELECT/INSERT/UPDATE/DELETE` only when `auth.uid() = user_id`.
- Verified two ways: a real cross-user attack test in Playwright
  (`frontend/e2e/routines.spec.ts`, goes through the actual PostgREST + JWT path) and a
  secret-free pgTAP suite at the SQL layer (`supabase/tests/database/routines_rls.test.sql`,
  runs on every push in CI). Run it locally with:
  ```bash
  cd backend
  npx supabase start
  PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres \
    -f supabase/tests/database/routines_rls.test.sql
  ```

## Data model source of truth

- Full schema: `supabase/schema.sql`
- Incremental changes: `supabase/migrations/`

If both exist, keep migrations and full schema aligned after each schema change.

## Notes

- `public.app_events`: minimal event log (no PII) for key actions.
- `public.get_nr_schema_status()`: endpoint (RPC) so the frontend can detect missing migrations and show a non-blocking warning.
- `supabase/functions/send-due-reminders`: scheduled Edge Function that prepares due-task reminder events in `app_events`.

## Reminders (Tier 2 foundation)

- Migration `supabase/migrations/0005_reminder_preferences.sql` creates `public.reminder_preferences` with RLS policies.
- Edge Function `send-due-reminders` scans due tasks and inserts `reminder_due_task` events in `public.app_events`.
- See `supabase/functions/README.md` for deploy/invoke/schedule commands.
