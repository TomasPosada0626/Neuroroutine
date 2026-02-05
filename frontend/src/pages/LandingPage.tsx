import { Link } from 'react-router-dom'
import { Card } from '@/shared/ui'

const primaryLinkClass =
  'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400 bg-slate-900 text-white hover:bg-slate-800'

const secondaryLinkClass =
  'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50'

function Sparkline() {
  return (
    <svg viewBox="0 0 120 40" className="h-10 w-full" aria-hidden="true">
      <defs>
        <linearGradient id="nrSpark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#06b6d4" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <path
        d="M2 30 C 14 18, 28 34, 40 24 S 66 14, 78 20 S 98 34, 118 10"
        fill="none"
        stroke="url(#nrSpark)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M2 30 C 14 18, 28 34, 40 24 S 66 14, 78 20 S 98 34, 118 10 L118 40 L2 40 Z"
        fill="#a78bfa"
        opacity="0.12"
      />
    </svg>
  )
}

function MiniBars() {
  const bars = [6, 10, 14, 9, 18, 12, 20]
  return (
    <div className="grid grid-cols-7 items-end gap-1 h-12" aria-hidden="true">
      {bars.map((v, idx) => (
        <div
          key={idx}
          className="rounded-sm bg-gradient-to-t from-cyan-500/70 to-violet-500/70"
          style={{ height: `${v * 2.2}px` }}
        />
      ))}
    </div>
  )
}

export function LandingPage() {
  return (
    <div className="h-dvh overflow-hidden bg-slate-950 text-slate-50">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500/30 via-violet-500/20 to-fuchsia-500/20 blur-3xl" />
        <div className="absolute -bottom-24 left-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)',
            backgroundSize: '18px 18px',
          }}
        />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-slate-950/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">NeuroRoutine</div>
              <div className="text-xs text-slate-300">Rutinas simples, hábitos sostenibles</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className={
                secondaryLinkClass +
                ' bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15 focus:ring-white/30'
              }
            >
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className={
                primaryLinkClass +
                ' bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 hover:opacity-95 focus:ring-white/30'
              }
            >
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
          {/* Left: pitch */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15">
              <span className="text-white/90">Minimalista</span>
              <span className="text-white/30">•</span>
              <span className="text-white/90">Datos por usuario (RLS)</span>
              <span className="text-white/30">•</span>
              <span className="text-white/90">Auth Supabase</span>
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Rutinas inteligentes,
              <span className="bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
                {' '}
                progreso visible.
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-base text-slate-300 sm:text-lg">
              Diseñada para ayudarte a ejecutar lo importante: crea rutinas, desglósalas en tareas y mantén el foco.
              Todo con una UX simple y una arquitectura lista para producción.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className={
                  primaryLinkClass +
                  ' bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 hover:opacity-95'
                }
              >
                Empezar gratis
              </Link>
              <Link
                to="/login"
                className={
                  secondaryLinkClass +
                  ' bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15'
                }
              >
                Ver mi dashboard
              </Link>

              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                Deploy activo en Vercel
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Card className="bg-white/5 p-4 ring-1 ring-white/10">
                <div className="text-xs text-slate-300">Consistencia</div>
                <div className="mt-1 text-lg font-semibold">+28%</div>
                <div className="mt-2">
                  <Sparkline />
                </div>
              </Card>

              <Card className="bg-white/5 p-4 ring-1 ring-white/10">
                <div className="text-xs text-slate-300">Tareas completadas</div>
                <div className="mt-1 text-lg font-semibold">12 hoy</div>
                <div className="mt-3">
                  <MiniBars />
                </div>
              </Card>

              <Card className="bg-white/5 p-4 ring-1 ring-white/10">
                <div className="text-xs text-slate-300">Streak</div>
                <div className="mt-1 text-lg font-semibold">7 días</div>
                <div className="mt-3 flex items-center gap-3">
                  <div
                    className="h-12 w-12 rounded-full"
                    style={{
                      background:
                        'conic-gradient(rgba(34,211,238,0.9) 0 260deg, rgba(255,255,255,0.12) 260deg 360deg)',
                    }}
                  />
                  <div className="text-xs text-slate-300">
                    Meta semanal
                    <div className="text-sm font-semibold text-white">72%</div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Card className="bg-white/5 p-4 ring-1 ring-white/10">
                <div className="text-sm font-semibold">Privacidad real</div>
                <div className="mt-1 text-sm text-slate-300">
                  RLS en Postgres: cada usuario solo ve sus rutinas y tareas.
                </div>
              </Card>
              <Card className="bg-white/5 p-4 ring-1 ring-white/10">
                <div className="text-sm font-semibold">Auth moderno</div>
                <div className="mt-1 text-sm text-slate-300">
                  Email/usuario + Google OAuth (Supabase).
                </div>
              </Card>
            </div>
          </div>

          {/* Right: dashboard preview (hidden on small screens to prevent scroll) */}
          <div className="hidden lg:col-span-5 lg:block">
            <div className="h-full rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Vista previa</div>
                  <div className="text-xs text-slate-300">Tablas y estado en tiempo real</div>
                </div>
                <div className="text-xs text-slate-300">Modo demo</div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-xl bg-slate-950/40 p-4 ring-1 ring-white/10">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-300">Rutinas</div>
                    <div className="text-xs text-slate-300">Hoy</div>
                  </div>

                  <div className="mt-3 overflow-hidden rounded-lg ring-1 ring-white/10">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/5 text-slate-300">
                        <tr>
                          <th className="px-3 py-2 font-medium">Título</th>
                          <th className="px-3 py-2 font-medium">Tareas</th>
                          <th className="px-3 py-2 font-medium">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 text-slate-200">
                        <tr>
                          <td className="px-3 py-2">Mañana enfocada</td>
                          <td className="px-3 py-2">3</td>
                          <td className="px-3 py-2">
                            <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-emerald-200 ring-1 ring-emerald-400/20">
                              En progreso
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2">Estudio</td>
                          <td className="px-3 py-2">5</td>
                          <td className="px-3 py-2">
                            <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-cyan-200 ring-1 ring-cyan-400/20">
                              Planificada
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2">Cierre del día</td>
                          <td className="px-3 py-2">2</td>
                          <td className="px-3 py-2">
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-slate-200 ring-1 ring-white/10">
                              Pendiente
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-950/40 p-4 ring-1 ring-white/10">
                    <div className="text-xs text-slate-300">Energía</div>
                    <div className="mt-1 text-base font-semibold">Alta</div>
                    <div className="mt-3 h-2 rounded-full bg-white/10">
                      <div className="h-2 w-[78%] rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" />
                    </div>
                    <div className="mt-2 text-xs text-slate-300">Ventana ideal: 9:00 – 11:00</div>
                  </div>
                  <div className="rounded-xl bg-slate-950/40 p-4 ring-1 ring-white/10">
                    <div className="text-xs text-slate-300">Foco</div>
                    <div className="mt-1 text-base font-semibold">2 bloques</div>
                    <div className="mt-3 flex gap-2">
                      <div className="h-6 flex-1 rounded-md bg-cyan-400/25 ring-1 ring-cyan-400/20" />
                      <div className="h-6 flex-1 rounded-md bg-violet-400/25 ring-1 ring-violet-400/20" />
                      <div className="h-6 flex-1 rounded-md bg-white/10 ring-1 ring-white/10" />
                    </div>
                    <div className="mt-2 text-xs text-slate-300">Pomodoro 25/5</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                <div className="text-xs text-slate-300">CTA</div>
                <div className="mt-1 text-sm">Crea tu primera rutina en menos de 30 segundos.</div>
                <div className="mt-3 flex gap-2">
                  <Link
                    to="/register"
                    className={
                      primaryLinkClass +
                      ' flex-1 bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 hover:opacity-95'
                    }
                  >
                    Registrarme
                  </Link>
                  <Link
                    to="/login"
                    className={
                      secondaryLinkClass +
                      ' flex-1 bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15'
                    }
                  >
                    Entrar
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
