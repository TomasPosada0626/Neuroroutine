# Backend (Supabase)

Este proyecto usa **Supabase** como backend real (Auth + Postgres) con políticas **RLS** para asegurar que cada usuario solo acceda a sus propios datos.

## Setup rápido

1. Crea un proyecto en Supabase.
2. Ve a **SQL Editor** y ejecuta el script: `supabase/schema.sql`.
	- Alternativa: aplica migraciones incrementales en `supabase/migrations/`.
3. En **Authentication → Providers**, habilita Email (si no está habilitado).
4. En el frontend, configura variables en `frontend/.env` (ver `frontend/.env.example`).

## Seguridad

- Las tablas tienen **Row Level Security** activada.
- Las políticas permiten `SELECT/INSERT/UPDATE/DELETE` solo cuando `auth.uid() = user_id`.

## Notas

- `public.app_events`: event log mínimo (sin PII) para acciones clave.
- `public.get_nr_schema_status()`: endpoint (RPC) para que el frontend detecte migraciones faltantes y muestre un aviso no bloqueante.
