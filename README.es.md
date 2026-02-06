<div align="center">
  <h1>NeuroRoutine</h1>
  <p><strong>Gestor inteligente de rutinas diarias (portfolio)</strong> enfocado en UX premium y buenas prácticas de SPA + Auth + RLS.</p>
  <p><em>React, TypeScript, Vite, Tailwind CSS, Supabase (Auth + Postgres + RLS), React Router, Zustand, React Hook Form, Zod, GitHub Actions, Vercel</em></p>
  <p><a href="https://neuroroutine.vercel.app/">Demo live: neuroroutine.vercel.app</a></p>
  <p><a href="./README.md">Read in English</a></p>
</div>

---

## Resumen

NeuroRoutine es una SPA lista para portfolio para planificar **rutinas y tareas** con persistencia real, autenticación y **seguridad a nivel de base de datos** (Supabase RLS).

## Features

- Auth (registro/login/logout) con Supabase.
- Rutas protegidas (solo usuarios autenticados).
- CRUD real sobre Postgres para rutinas y tareas.
- Dashboard de analíticas (KPIs, rachas, consistencia, heatmap).
- Historial “analytics-grade” con event log.
- UI moderna con Tailwind + estado global (Zustand).

## Stack

**Frontend**: React + TypeScript, Vite, Tailwind, React Router, Zustand, React Hook Form + Zod.

**Backend**: Supabase Auth + Postgres + RLS.

**Calidad/DevOps**: Vitest, Playwright, GitHub Actions.

## Estructura del repo

- `frontend/`: SPA React.
- `backend/`: SQL (schema + migraciones) y docs.

## Migraciones (DB)

Este repo mantiene ambos enfoques:

- `backend/supabase/schema.sql` (schema completo para bootstrapping)
- `backend/supabase/migrations/` (migraciones incrementales)

Además, el backend expone `get_nr_schema_status()` para que el frontend detecte migraciones faltantes y muestre un aviso no bloqueante.

## Pruebas

Comandos útiles (desde `frontend/`):

```bash
npm run test
npm run test:coverage
npm run e2e
```

Cobertura (corrida local 2026-02-06): **52.6% statements**, **34.44% branches**, **48.14% functions**, **53.52% lines**.

> Nota: el test E2E autenticado se salta a menos que definas `E2E_USER_IDENTIFIER` y `E2E_USER_PASSWORD`.

## Seguridad

- RLS activado en `profiles`, `routines`, `routine_tasks`.
- Políticas por usuario: acceso permitido solo cuando `auth.uid()` coincide con el dueño.
- Claves:
  - OK en frontend: `VITE_SUPABASE_ANON_KEY` (pública) + RLS.
  - Nunca en frontend: `service_role`.

### Security proof (RLS)

Puedes reproducir el comportamiento de RLS en el SQL Editor de Supabase simulando claims del JWT.

> Reemplaza `USER_A_UUID` y `USER_B_UUID` por valores reales de `auth.users.id`.

**Query 1 — el usuario B no puede leer data del usuario A**

```sql
-- Como user A
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'USER_A_UUID', true);

insert into public.routines (user_id, title)
values (auth.uid(), 'Rutina de A')
returning id, user_id, title;

-- Como user B
select set_config('request.jwt.claim.sub', 'USER_B_UUID', true);

-- Debe retornar 0 filas por RLS
select id, user_id, title
from public.routines
where title = 'Rutina de A';
```

**Query 2 — el usuario B no puede insertar en nombre del usuario A**

```sql
-- Como user B
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'USER_B_UUID', true);

-- Debe fallar por RLS
insert into public.routines (user_id, title)
values ('USER_A_UUID', 'Intento malicioso');
```
