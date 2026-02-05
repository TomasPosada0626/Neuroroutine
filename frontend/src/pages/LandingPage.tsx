import { useEffect, useMemo, useRef, useState } from 'react'
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

function MiniBars({ bars }: { bars: number[] }) {
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

type UseCase = 'study' | 'fitness' | 'work'

function UseCaseTabs({ value, onChange }: { value: UseCase; onChange: (v: UseCase) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-white/5 p-1 ring-1 ring-white/10">
      <button
        type="button"
        onClick={() => onChange('study')}
        className={
          'rounded-md px-2.5 py-1 text-xs font-medium transition ' +
          (value === 'study'
            ? 'bg-white/10 text-white ring-1 ring-white/15'
            : 'text-slate-300 hover:bg-white/5 hover:text-white')
        }
      >
        Estudio
      </button>
      <button
        type="button"
        onClick={() => onChange('fitness')}
        className={
          'rounded-md px-2.5 py-1 text-xs font-medium transition ' +
          (value === 'fitness'
            ? 'bg-white/10 text-white ring-1 ring-white/15'
            : 'text-slate-300 hover:bg-white/5 hover:text-white')
        }
      >
        Fitness
      </button>
      <button
        type="button"
        onClick={() => onChange('work')}
        className={
          'rounded-md px-2.5 py-1 text-xs font-medium transition ' +
          (value === 'work'
            ? 'bg-white/10 text-white ring-1 ring-white/15'
            : 'text-slate-300 hover:bg-white/5 hover:text-white')
        }
      >
        Trabajo
      </button>
    </div>
  )
}

export function LandingPage() {
  const [useCase, setUseCase] = useState<UseCase>('study')
  const [isSwitching, setIsSwitching] = useState(false)
  const switchTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (switchTimerRef.current != null) {
        window.clearTimeout(switchTimerRef.current)
      }
    }
  }, [])

  const handleUseCaseChange = (next: UseCase) => {
    setUseCase(next)
    setIsSwitching(true)
    if (switchTimerRef.current != null) {
      window.clearTimeout(switchTimerRef.current)
    }
    switchTimerRef.current = window.setTimeout(() => setIsSwitching(false), 260)
  }

  const content = useMemo(() => {
    if (useCase === 'study') {
      return {
        badge: 'Para estudiar sin procrastinar',
        subtitle:
          'Organiza tu sesión en pasos cortos. Menos “¿por dónde empiezo?” y más avance real.',
        metricPill: '10s para crear una rutina',
        stat1Label: 'Constancia',
        stat1Value: '+28%',
        stat2Label: 'Bloques hoy',
        stat2Value: '3',
        stat3Label: 'Racha',
        stat3Value: '7 días',
        weeklyTargetPct: 72,
        bars: [6, 10, 14, 9, 18, 12, 20],
        tableTitle: 'Plan rápido (Estudio)',
        tableRows: [
          { title: 'Repaso 10 min', tasks: 2, status: 'Listo', tone: 'emerald' as const },
          { title: 'Problemas 25 min', tasks: 4, status: 'En progreso', tone: 'cyan' as const },
          { title: 'Resumen 5 min', tasks: 1, status: 'Siguiente', tone: 'neutral' as const },
        ],
        testimonials: [
          {
            quote: '“Me quita fricción. Entro y ya sé qué hacer.”',
            name: 'Andrea • estudiante',
          },
          {
            quote: '“Mi día dejó de ser una lista infinita: ahora son bloques claros.”',
            name: 'Luis • autodidacta',
          },
        ],
      }
    }

    if (useCase === 'fitness') {
      return {
        badge: 'Para entrenar y no fallar',
        subtitle:
          'Convierte “tengo que entrenar” en un plan simple. Pequeñas acciones, gran consistencia.',
        metricPill: 'Rutina lista en 30s',
        stat1Label: 'Constancia',
        stat1Value: '+19%',
        stat2Label: 'Sesiones',
        stat2Value: '2',
        stat3Label: 'Racha',
        stat3Value: '5 días',
        weeklyTargetPct: 64,
        bars: [8, 12, 9, 14, 11, 16, 13],
        tableTitle: 'Plan rápido (Fitness)',
        tableRows: [
          { title: 'Calentamiento', tasks: 3, status: 'Listo', tone: 'emerald' as const },
          { title: 'Fuerza', tasks: 5, status: 'En progreso', tone: 'cyan' as const },
          { title: 'Estiramiento', tasks: 2, status: 'Siguiente', tone: 'neutral' as const },
        ],
        testimonials: [
          {
            quote: '“Lo hago más seguido porque es simple y rápido.”',
            name: 'Camila • fitness',
          },
          {
            quote: '“Me mantiene constante sin sentirlo pesado.”',
            name: 'Diego • runner',
          },
        ],
      }
    }

    return {
      badge: 'Para trabajar con calma',
      subtitle:
        'Define 3 prioridades, conviértelas en tareas y avanza sin ruido. Lo esencial, claro.',
      metricPill: 'Plan del día en 1 min',
      stat1Label: 'Claridad',
      stat1Value: '+22%',
      stat2Label: 'Prioridades',
      stat2Value: '3',
      stat3Label: 'Racha',
      stat3Value: '6 días',
      weeklyTargetPct: 68,
      bars: [10, 9, 13, 11, 15, 12, 18],
      tableTitle: 'Plan rápido (Trabajo)',
      tableRows: [
        { title: 'Inbox 10 min', tasks: 2, status: 'Listo', tone: 'emerald' as const },
        { title: 'Proyecto 45 min', tasks: 3, status: 'En progreso', tone: 'cyan' as const },
        { title: 'Cierre 5 min', tasks: 1, status: 'Siguiente', tone: 'neutral' as const },
      ],
      testimonials: [
        {
          quote: '“Me ayuda a enfocarme sin sentirme abrumado.”',
          name: 'Sofía • producto',
        },
        {
          quote: '“Ahora sí cierro el día con sensación de avance.”',
          name: 'Julián • dev',
        },
      ],
    }
  }, [useCase])

  const filledDays = Math.max(1, Math.min(7, Math.round((content.weeklyTargetPct / 100) * 7)))

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

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-5 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
          {/* Left: pitch */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15">
              <span className="text-white/90">Simple</span>
              <span className="text-white/30">•</span>
              <span className="text-white/90">Solo tú lo ves</span>
              <span className="text-white/30">•</span>
              <span className="text-white/90">Tu progreso, claro</span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-slate-200 ring-1 ring-white/10">
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" />
                {content.badge}
              </div>
              <div className="sm:hidden">
                <UseCaseTabs value={useCase} onChange={handleUseCaseChange} />
              </div>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
              Rutinas inteligentes,
              <span className="bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
                {' '}
                progreso visible.
              </span>
            </h1>

            <p className="mt-3 max-w-xl text-sm text-slate-300 sm:mt-4 sm:text-lg">
              {content.subtitle}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 sm:mt-6">
              <Link
                to="/register"
                className={
                  primaryLinkClass +
                  ' relative overflow-hidden bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 hover:opacity-95' +
                  ' motion-safe:transition motion-safe:duration-300 hover:-translate-y-0.5'
                }
              >
                <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 hover:opacity-100" />
                Empezar gratis
              </Link>
              <Link
                to="/login"
                className={
                  secondaryLinkClass +
                  ' bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15' +
                  ' motion-safe:transition motion-safe:duration-300 hover:-translate-y-0.5'
                }
              >
                Ver mi dashboard
              </Link>

              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                Listo para empezar hoy
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-slate-200 ring-1 ring-white/10">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                {content.metricPill}
              </div>
            </div>

            <div className={"mt-5 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-3 " + (isSwitching ? 'motion-safe:animate-pulse' : '')}>
              <Card className="bg-white/5 p-3 ring-1 ring-white/10 sm:p-4 motion-safe:transition motion-safe:duration-300 hover:bg-white/7 hover:-translate-y-0.5">
                <div className="text-[11px] text-slate-300 sm:text-xs">{content.stat1Label}</div>
                <div className="mt-0.5 text-base font-semibold sm:mt-1 sm:text-lg">{content.stat1Value}</div>
                <div className="mt-2 hidden sm:block">
                  <Sparkline />
                </div>
              </Card>

              <Card className="bg-white/5 p-3 ring-1 ring-white/10 sm:p-4 motion-safe:transition motion-safe:duration-300 hover:bg-white/7 hover:-translate-y-0.5">
                <div className="text-[11px] text-slate-300 sm:text-xs">{content.stat2Label}</div>
                <div className="mt-0.5 text-base font-semibold sm:mt-1 sm:text-lg">{content.stat2Value}</div>
                <div className="mt-2 hidden sm:block">
                  <MiniBars bars={content.bars} />
                </div>
              </Card>

              <Card className="bg-white/5 p-3 ring-1 ring-white/10 sm:p-4 motion-safe:transition motion-safe:duration-300 hover:bg-white/7 hover:-translate-y-0.5">
                <div className="text-[11px] text-slate-300 sm:text-xs">Streak</div>
                <div className="mt-0.5 text-base font-semibold sm:mt-1 sm:text-lg">{content.stat3Value}</div>
                <div className="mt-2 hidden items-center gap-3 sm:flex">
                  <div
                    className="h-12 w-12 rounded-full"
                    style={{
                      background:
                        `conic-gradient(rgba(34,211,238,0.9) 0 ${(content.weeklyTargetPct / 100) * 360}deg, rgba(255,255,255,0.12) ${(content.weeklyTargetPct / 100) * 360}deg 360deg)`,
                    }}
                  />
                  <div className="text-xs text-slate-300">
                    Meta semanal
                    <div className="text-sm font-semibold text-white">{content.weeklyTargetPct}%</div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="mt-5 hidden gap-3 sm:mt-6 sm:grid sm:grid-cols-2">
              <Card className="bg-white/5 p-4 ring-1 ring-white/10">
                <div className="text-sm font-semibold">Tu espacio es tuyo</div>
                <div className="mt-1 text-sm text-slate-300">
                  Tus rutinas y tu progreso se mantienen privados.
                </div>
              </Card>
              <Card className="bg-white/5 p-4 ring-1 ring-white/10">
                <div className="text-sm font-semibold">Entra como prefieras</div>
                <div className="mt-1 text-sm text-slate-300">
                  Accede con tu usuario, tu email o Google.
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
                  <div className="text-xs text-slate-300">Elige un caso y mira cómo se ve</div>
                </div>
                <UseCaseTabs value={useCase} onChange={handleUseCaseChange} />
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-xl bg-slate-950/40 p-4 ring-1 ring-white/10">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-300">{content.tableTitle}</div>
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
                        {content.tableRows.map((r) => (
                          <tr key={r.title} className={isSwitching ? 'opacity-70' : 'opacity-100'}>
                            <td className="px-3 py-2">{r.title}</td>
                            <td className="px-3 py-2">{r.tasks}</td>
                            <td className="px-3 py-2">
                              {r.tone === 'emerald' ? (
                                <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-emerald-200 ring-1 ring-emerald-400/20">
                                  {r.status}
                                </span>
                              ) : r.tone === 'cyan' ? (
                                <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-cyan-200 ring-1 ring-cyan-400/20">
                                  {r.status}
                                </span>
                              ) : (
                                <span className="rounded-full bg-white/10 px-2 py-0.5 text-slate-200 ring-1 ring-white/10">
                                  {r.status}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-950/40 p-4 ring-1 ring-white/10">
                    <div className="text-xs text-slate-300">Avance</div>
                    <div className="mt-1 text-base font-semibold">Se siente mejor</div>
                    <div className="mt-3 h-2 rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 motion-safe:transition-all motion-safe:duration-300"
                        style={{ width: `${content.weeklyTargetPct}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-slate-300">Más claridad con menos esfuerzo</div>
                  </div>
                  <div className="rounded-xl bg-slate-950/40 p-4 ring-1 ring-white/10">
                    <div className="text-xs text-slate-300">Hoy</div>
                    <div className="mt-1 text-base font-semibold">Hecho es mejor</div>
                    <div className="mt-3 flex gap-2">
                      <div className="h-6 flex-1 rounded-md bg-cyan-400/25 ring-1 ring-cyan-400/20" />
                      <div className="h-6 flex-1 rounded-md bg-violet-400/25 ring-1 ring-violet-400/20" />
                      <div className="h-6 flex-1 rounded-md bg-white/10 ring-1 ring-white/10" />
                    </div>
                    <div className="mt-2 text-xs text-slate-300">Pequeños pasos, gran progreso</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                    <div className="text-xs text-slate-300">En 3 pasos</div>
                    <div className="mt-2 space-y-2 text-sm text-slate-200">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/20">
                          1
                        </span>
                        <div>
                          Elige un objetivo <span className="text-slate-400">({useCase === 'study' ? 'estudiar' : useCase === 'fitness' ? 'entrenar' : 'trabajar'})</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-violet-400/15 text-violet-200 ring-1 ring-violet-400/20">
                          2
                        </span>
                        <div>Divide en tareas pequeñas</div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/20">
                          3
                        </span>
                        <div>Marca lo hecho y sigue</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-300">Tu semana</div>
                      <div className="text-xs text-slate-400">{content.weeklyTargetPct}%</div>
                    </div>
                    <div className="mt-2 grid grid-cols-7 gap-1.5" aria-hidden="true">
                      {Array.from({ length: 7 }).map((_, idx) => (
                        <div
                          key={idx}
                          className={
                            'h-6 rounded-md ring-1 ring-white/10 motion-safe:transition-all motion-safe:duration-300 ' +
                            (idx < filledDays
                              ? 'bg-gradient-to-br from-cyan-400/35 to-violet-500/25'
                              : 'bg-slate-950/30')
                          }
                        />
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-slate-300">Pequeños pasos &gt; días perfectos</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
