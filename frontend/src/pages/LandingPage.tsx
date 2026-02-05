import { Link } from 'react-router-dom'
import { Card } from '@/shared/ui'

const primaryLinkClass =
  'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400 bg-slate-900 text-white hover:bg-slate-800'

const secondaryLinkClass =
  'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50'

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">NeuroRoutine</div>
              <div className="text-xs text-slate-500">Rutinas simples, hábitos sostenibles</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/login" className={secondaryLinkClass}>
              Iniciar sesión
            </Link>
            <Link to="/register" className={primaryLinkClass}>
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs ring-1 ring-slate-200">
              Portfolio-ready • Supabase Auth • RLS
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Tu día, en rutinas claras.
            </h1>
            <p className="mt-4 text-base text-slate-600 sm:text-lg">
              NeuroRoutine te ayuda a crear rutinas, dividirlas en tareas y mantener el foco. Minimalista por fuera,
              robusto por dentro (autenticación y datos aislados por usuario).
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/register" className={primaryLinkClass}>
                Crear cuenta
              </Link>
              <Link to="/login" className={secondaryLinkClass}>
                Ya tengo cuenta
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Card className="p-5">
                <div className="text-sm font-semibold">Privacidad por usuario</div>
                <div className="mt-1 text-sm text-slate-600">
                  RLS en Postgres: nadie ve tus rutinas salvo tú.
                </div>
              </Card>
              <Card className="p-5">
                <div className="text-sm font-semibold">Rutinas + tareas</div>
                <div className="mt-1 text-sm text-slate-600">
                  Crea, edita y completa tareas sin fricción.
                </div>
              </Card>
              <Card className="p-5">
                <div className="text-sm font-semibold">Login flexible</div>
                <div className="mt-1 text-sm text-slate-600">
                  Entra con correo o nombre de usuario.
                </div>
              </Card>
              <Card className="p-5">
                <div className="text-sm font-semibold">UI moderna</div>
                <div className="mt-1 text-sm text-slate-600">
                  Tailwind + formularios con validación (RHF + Zod).
                </div>
              </Card>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
            <div className="text-sm font-semibold">Vista previa</div>
            <div className="mt-1 text-sm text-slate-600">
              Así se ve el dashboard: rutinas a la izquierda, tareas y notas a la derecha.
            </div>
            <div className="mt-6 grid gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Rutina</div>
                <div className="mt-1 font-medium">Mañana enfocada</div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-4 w-4 rounded border border-slate-300 bg-white" />
                    <div>Agua + estiramiento</div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-4 w-4 rounded border border-slate-300 bg-white" />
                    <div>Plan del día (3 prioridades)</div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-4 w-4 rounded border border-slate-300 bg-white" />
                    <div>Deep work 25 min</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">Notas</div>
                <div className="mt-1 text-sm text-slate-600">
                  “Menos tareas, más consistencia. Hoy solo lo esencial.”
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
