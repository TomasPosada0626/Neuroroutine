# Deployment and Runtime Guide

This project is a frontend SPA (React/Vite) that uses Supabase as backend (Auth + Postgres + RLS).

## Supported run modes

1. Local frontend + Supabase cloud (recommended local workflow)
2. Local frontend + Supabase local (optional full-local workflow)
3. Production deploy on Vercel
4. Production deploy on Render

## Requirements

- Node.js 18+
- npm 9+
- Supabase project (cloud) or Supabase CLI + Docker (local backend mode)

## Environment variables

Frontend variables (`frontend/.env.local`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SENTRY_DSN` (optional)
- `VITE_NR_APP_VARIANT` (`app` recommended for production)

Environment scope note:

- Put frontend runtime variables in `frontend/.env.local`.
- Root `.env.local` is typically for tooling contexts (for example Vercel CLI) and should not be relied on for Vite frontend runtime.

## Mode 1: local frontend + Supabase cloud

1. Install deps

```bash
cd frontend
npm install
```

2. Create env file

```bash
cp .env.example .env.local
```

Windows alternative:

```bash
copy .env.example .env.local
```

3. Fill cloud Supabase values in `.env.local`

4. Start frontend

```bash
npm run dev
```

## Mode 2: local frontend + Supabase local

1. Start Supabase local stack

```bash
supabase start
```

2. Apply schema/migrations

- Run `backend/supabase/schema.sql` in local Supabase SQL editor, or
- apply SQL files from `backend/supabase/migrations/`

3. Set local Supabase values in `frontend/.env.local`

4. Run frontend

```bash
cd frontend
npm run dev
```

## Mode 3: deploy on Vercel

Project settings:

- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

SPA routing:

- Keep `frontend/vercel.json` with rewrite to `index.html`

Optional GitHub workflow:

- `.github/workflows/deploy-vercel.yml`

Required GitHub secrets/variables (if using workflow):

- Secret: `VERCEL_TOKEN`
- Variable: `VERCEL_ORG_ID`
- Variable: `VERCEL_PROJECT_ID`

## Mode 4: deploy on Render

This repo includes a Render Blueprint:

- `render.yaml`

Blueprint configuration already defines:

- Static site service
- Root dir `frontend`
- Build `npm ci && npm run build`
- Publish dir `dist`
- SPA rewrite `/* -> /index.html`

Optional GitHub workflow:

- `.github/workflows/deploy-render.yml`

Required GitHub secret (if using workflow):

- Secret: `RENDER_DEPLOY_HOOK_URL`

## Portfolio recommendation

To present this project professionally in a CV:

- Keep Vercel as primary public demo URL.
- Keep Render as alternate deploy path (operational resilience).
- Keep this guide and root README aligned whenever deployment settings change.
