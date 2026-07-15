# Backend (Supabase)

This project uses **Supabase** as the real backend (Auth + Postgres) with **RLS** policies so each user can only access their own data.

## Quick setup

1. Create a Supabase project.
2. Open **SQL Editor** and run: `supabase/schema.sql`.
   - Alternative: apply incremental migrations from `supabase/migrations/`.
3. In **Authentication -> Providers**, enable Email (if not enabled).
4. In the frontend, configure variables in `frontend/.env` (see `frontend/.env.example`).

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

## Data model source of truth

- Full schema: `supabase/schema.sql`
- Incremental changes: `supabase/migrations/`

If both exist, keep migrations and full schema aligned after each schema change.

## Notes

- `public.app_events`: minimal event log (no PII) for key actions.
- `public.get_nr_schema_status()`: endpoint (RPC) so the frontend can detect missing migrations and show a non-blocking warning.
