# NeuroRoutine (Frontend)

React + TypeScript + Tailwind + Supabase.

## Setup

1. Variables de entorno:

```bash
cp .env.example .env
```

2. Completa:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Opcional:

- `VITE_SENTRY_DSN` (error tracking en frontend)

3. Instala y ejecuta:

```bash
npm install
npm run dev
```

## CI

En GitHub Actions se corre `npm run lint`, `npm run test`, `npm run build` y un smoke suite de Playwright (desde la carpeta `frontend/`).

## Tests

```bash
npm run test
```

## E2E (Playwright)

```bash
npm run e2e
```

El test de login real se omite a menos que configures:

- `E2E_USER_IDENTIFIER`
- `E2E_USER_PASSWORD`

## Rutas

- `/login`
- `/register`
- `/app` (protegida)

## Arquitectura

- `src/app`: router + bootstrap
- `src/shared`: UI/layout/lib/api reutilizable
- `src/features/auth`: auth store (Zustand) + guard
- `src/features/routines`: CRUD + store + UI
- `src/pages`: páginas (login/register/dashboard)

## Aliases

- `@/` apunta a `src/` (configurado en Vite + tsconfig)

## Imports

- Preferir imports desde barrels: `@/shared/ui`, `@/shared/layout`, `@/shared/api`
