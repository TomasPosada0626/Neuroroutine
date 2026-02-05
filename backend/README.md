# Backend (Supabase)

Este proyecto usa **Supabase** como backend real (Auth + Postgres) con políticas **RLS** para asegurar que cada usuario solo acceda a sus propios datos.

## Setup rápido

1. Crea un proyecto en Supabase.
2. Ve a **SQL Editor** y ejecuta el script: `supabase/schema.sql`.
3. En **Authentication → Providers**, habilita Email (si no está habilitado).
4. En el frontend, configura variables en `frontend/.env` (ver `frontend/.env.example`).

## Seguridad

- Las tablas tienen **Row Level Security** activada.
- Las políticas permiten `SELECT/INSERT/UPDATE/DELETE` solo cuando `auth.uid() = user_id`.
