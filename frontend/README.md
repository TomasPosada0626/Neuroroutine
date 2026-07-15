# NeuroRoutine (Frontend)

React + TypeScript + Tailwind + Supabase.

## Quick start

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

## Setup

1. Create environment file:

```bash
cp .env.example .env
```

Windows alternative:

```bash
copy .env.example .env.local
```

2. Fill required variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional:

- `VITE_SENTRY_DSN` (frontend error tracking)

3. Scope note for env files:

- Use `frontend/.env.local` for frontend runtime values.
- Root `.env.local` is typically used by tooling (for example Vercel CLI), not by Vite frontend runtime.

4. Install and run:

```bash
npm install
npm run dev
```

## Build and preview

```bash
npm run build
npm run preview:only
```

## CI

GitHub Actions runs `npm run lint`, `npm run test`, `npm run build`, and a Playwright smoke suite (from the `frontend/` directory).

## Tests

```bash
npm run test
```

## E2E (Playwright)

```bash
npm run e2e
```

The real login E2E test is skipped unless you configure:

- `E2E_USER_IDENTIFIER`
- `E2E_USER_PASSWORD`

## Routes

- `/login`
- `/register`
- `/app` (protected)

## Architecture

- `src/main.tsx`: runtime bootstrap, env guard, Router mount
- `src/app`: router + bootstrap
- `src/shared`: reusable UI/layout/lib/api
- `src/features/auth`: auth store (Zustand) + guard
- `src/features/routines`: CRUD + store + UI
- `src/pages`: pages (login/register/dashboard)

## Supabase integration contract

- Frontend expects `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Missing variables are treated as a startup misconfiguration.
- Anonymous/public key is safe for frontend usage when RLS is enabled.

## Smoke validation checklist

1. Open the app locally and confirm no startup env error is shown.
2. Register with email/password.
3. Log in and confirm redirect to `/app`.
4. Create a routine/task and verify persistence after refresh.

## Aliases

- `@/` points to `src/` (configured in Vite + tsconfig)

## Imports

- Prefer imports from barrels: `@/shared/ui`, `@/shared/layout`, `@/shared/api`
