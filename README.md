# NeuroRoutine

Gestor inteligente de rutinas diarias (portfolio).

## Estructura

- `frontend/`: app web (React + TypeScript + Tailwind)
- `backend/`: capa de persistencia y configuración (Supabase SQL/RLS y documentación)

## Desarrollo

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## CI/CD (GitHub Actions)

### CI (integración continua)

Este repo incluye un workflow que se ejecuta en cada `push` a `main` y en cada Pull Request:

- instala dependencias (`npm ci`)
- corre lint (`npm run lint`)
- compila (`npm run build`)

Workflow: [.github/workflows/ci.yml](.github/workflows/ci.yml)

### CD (despliegue continuo)

Opciones recomendadas (simples y profesionales):

1) **Vercel o Netlify (recomendado)**
	- Conectas el repo y el proveedor hace deploy automático al hacer push.
	- Build command: `npm run build`
	- Output dir: `frontend/dist`
	- Root dir: `frontend`
	- Variables de entorno: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`

2) **GitHub Actions deploy**
	- Se puede automatizar con secretos (tokens) del proveedor.
	- Útil si quieres todo en Actions, pero requiere configurar `Secrets` en GitHub.

#### CD a Vercel (via GitHub Actions)

Ya está agregado el workflow: [.github/workflows/deploy-vercel.yml](.github/workflows/deploy-vercel.yml)

Para activarlo necesitas crear estos **Secrets** en tu repo de GitHub:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Y en Vercel debes configurar variables de entorno de tu proyecto:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Si prefieres lo más simple: usa la integración Git de Vercel/Netlify y puedes ignorar el workflow de deploy.

## Estado del proyecto (qué ya está hecho)

- UI base responsive + Tailwind, layout minimalista
- Auth (register/login/logout) con Supabase
- Rutas protegidas
- CRUD de rutinas y tareas con persistencia real
- Backend Supabase documentado con RLS (script SQL)

Pendiente (si lo quieres a nivel “producto”): recordatorios/notifications, edición de tareas, reordenamiento, analytics/hábitos, etc.

## Notas

- El "backend" de este proyecto se implementa con Supabase (Auth + Postgres) para mantener la app simple, segura y lista para producción.
