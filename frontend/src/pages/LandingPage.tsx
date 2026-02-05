import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, ThemeToggle } from '@/shared/ui'
import { useUiStore, type ThemeMode } from '@/shared/state/uiStore'

const primaryLinkClass =
  'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400 bg-slate-900 text-white hover:bg-slate-800'

const secondaryLinkClass =
  'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const parseFirstInt = (value: string) => {
  const m = value.match(/-?\d+/)
  return m ? Number(m[0]) : 0
}

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
type Preset = 'starter' | 'sprint' | 'light'
type EnergyLevel = 'low' | 'medium' | 'high'

const presetForEnergy = (level: EnergyLevel): Preset => {
  if (level === 'low') return 'light'
  if (level === 'high') return 'sprint'
  return 'starter'
}

function UseCaseTabs({
  value,
  onChange,
  theme,
}: {
  value: UseCase
  onChange: (v: UseCase) => void
  theme?: ThemeMode
}) {
  const isDay = theme === 'day'
  const wrapClass = isDay
    ? 'inline-flex rounded-lg bg-slate-900/5 p-1 ring-1 ring-slate-200'
    : 'inline-flex rounded-lg bg-white/5 p-1 ring-1 ring-white/10'
  const selectedClass = isDay
    ? 'bg-slate-900 text-white ring-1 ring-slate-900/15'
    : 'bg-white/10 text-white ring-1 ring-white/15'
  const unselectedClass = isDay
    ? 'text-slate-600 hover:bg-slate-900/5 hover:text-slate-900'
    : 'text-slate-300 hover:bg-white/5 hover:text-white'

  return (
    <div className={wrapClass}>
      <button
        type="button"
        onClick={() => onChange('study')}
        className={
          'rounded-md px-2.5 py-1 text-xs font-medium transition ' +
          (value === 'study' ? selectedClass : unselectedClass)
        }
      >
        Estudio
      </button>
      <button
        type="button"
        onClick={() => onChange('fitness')}
        className={
          'rounded-md px-2.5 py-1 text-xs font-medium transition ' +
          (value === 'fitness' ? selectedClass : unselectedClass)
        }
      >
        Fitness
      </button>
      <button
        type="button"
        onClick={() => onChange('work')}
        className={
          'rounded-md px-2.5 py-1 text-xs font-medium transition ' +
          (value === 'work' ? selectedClass : unselectedClass)
        }
      >
        Trabajo
      </button>
    </div>
  )
}

export function LandingPage() {
  const [useCase, setUseCase] = useState<UseCase>('study')
  const [preset, setPreset] = useState<Preset>('starter')
  const [energy, setEnergy] = useState<EnergyLevel>('medium')
  const theme = useUiStore((s) => s.theme)
  const [isSwitching, setIsSwitching] = useState(false)
  const [demoStep, setDemoStep] = useState(0)
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
    setPreset('starter')
    setEnergy('medium')
    setDemoStep(0)
    setIsSwitching(true)
    if (switchTimerRef.current != null) {
      window.clearTimeout(switchTimerRef.current)
    }
    switchTimerRef.current = window.setTimeout(() => setIsSwitching(false), 260)
  }

  const content = useMemo(() => {
    const base = (() => {
      if (useCase === 'study') {
        return {
        badge: 'Para estudiar sin procrastinar',
        subtitle:
          'Organiza tu sesión en pasos cortos. Menos “¿por dónde empiezo?” y más avance real.',
        stat1Label: 'Constancia',
        stat1Value: '+28%',
        stat2Label: 'Bloques hoy',
        stat2Value: '3',
        stat3Label: 'Racha',
        stat3Value: '7 días',
        weeklyTargetPct: 72,
        bars: [6, 10, 14, 9, 18, 12, 20],
        presets: {
          starter: {
            label: 'Sesión rápida',
            metricPill: '10s para armar tu sesión',
            tableTitle: 'Sesión (Rápida)',
            tableRows: [
              { title: 'Repaso 10 min', tasks: 2, status: 'Listo', tone: 'emerald' as const },
              { title: 'Problemas 25 min', tasks: 4, status: 'En progreso', tone: 'cyan' as const },
              { title: 'Resumen 5 min', tasks: 1, status: 'Siguiente', tone: 'neutral' as const },
            ],
          },
          sprint: {
            label: 'Sprint',
            metricPill: 'Una meta, sin distracciones',
            tableTitle: 'Sesión (Sprint)',
            tableRows: [
              { title: 'Preparar 2 min', tasks: 1, status: 'Listo', tone: 'emerald' as const },
              { title: 'Deep study 35 min', tasks: 3, status: 'Listo', tone: 'emerald' as const },
              { title: 'Cierre 3 min', tasks: 1, status: 'Siguiente', tone: 'neutral' as const },
            ],
          },
          light: {
            label: 'Suave',
            metricPill: 'Empieza pequeño, hoy cuenta',
            tableTitle: 'Sesión (Suave)',
            tableRows: [
              { title: 'Lectura 10 min', tasks: 1, status: 'En progreso', tone: 'cyan' as const },
              { title: 'Ejercicio 10 min', tasks: 1, status: 'Siguiente', tone: 'neutral' as const },
              { title: 'Nota 2 min', tasks: 1, status: 'Siguiente', tone: 'neutral' as const },
            ],
          },
        } satisfies Record<Preset, { label: string; metricPill: string; tableTitle: string; tableRows: { title: string; tasks: number; status: string; tone: 'emerald' | 'cyan' | 'neutral' }[] }>,
        }
      }

      if (useCase === 'fitness') {
        return {
        badge: 'Para entrenar y no fallar',
        subtitle:
          'Convierte “tengo que entrenar” en un plan simple. Pequeñas acciones, gran consistencia.',
        stat1Label: 'Constancia',
        stat1Value: '+19%',
        stat2Label: 'Sesiones',
        stat2Value: '2',
        stat3Label: 'Racha',
        stat3Value: '5 días',
        weeklyTargetPct: 64,
        bars: [8, 12, 9, 14, 11, 16, 13],
        presets: {
          starter: {
            label: 'Rutina base',
            metricPill: 'Rutina lista en 30s',
            tableTitle: 'Rutina (Base)',
            tableRows: [
              { title: 'Calentamiento', tasks: 3, status: 'Listo', tone: 'emerald' as const },
              { title: 'Fuerza', tasks: 5, status: 'En progreso', tone: 'cyan' as const },
              { title: 'Estiramiento', tasks: 2, status: 'Siguiente', tone: 'neutral' as const },
            ],
          },
          sprint: {
            label: 'Express',
            metricPill: 'Hoy cuenta, aunque sea poco',
            tableTitle: 'Rutina (Express)',
            tableRows: [
              { title: 'Movilidad 4 min', tasks: 2, status: 'Listo', tone: 'emerald' as const },
              { title: 'Circuito 12 min', tasks: 4, status: 'Listo', tone: 'emerald' as const },
              { title: 'Respira 2 min', tasks: 1, status: 'Siguiente', tone: 'neutral' as const },
            ],
          },
          light: {
            label: 'Suave',
            metricPill: 'Sin presión, solo movimiento',
            tableTitle: 'Rutina (Suave)',
            tableRows: [
              { title: 'Caminata 10 min', tasks: 1, status: 'En progreso', tone: 'cyan' as const },
              { title: 'Estira 5 min', tasks: 1, status: 'Siguiente', tone: 'neutral' as const },
              { title: 'Agua', tasks: 1, status: 'Siguiente', tone: 'neutral' as const },
            ],
          },
        } satisfies Record<Preset, { label: string; metricPill: string; tableTitle: string; tableRows: { title: string; tasks: number; status: string; tone: 'emerald' | 'cyan' | 'neutral' }[] }>,
        }
      }

      return {
      badge: 'Para trabajar con calma',
      subtitle:
        'Define 3 prioridades, conviértelas en tareas y avanza sin ruido. Lo esencial, claro.',
      stat1Label: 'Claridad',
      stat1Value: '+22%',
      stat2Label: 'Prioridades',
      stat2Value: '3',
      stat3Label: 'Racha',
      stat3Value: '6 días',
      weeklyTargetPct: 68,
      bars: [10, 9, 13, 11, 15, 12, 18],
      presets: {
        starter: {
          label: 'Día claro',
          metricPill: 'Plan del día en 1 min',
          tableTitle: 'Día (Claro)',
          tableRows: [
            { title: 'Inbox 10 min', tasks: 2, status: 'Listo', tone: 'emerald' as const },
            { title: 'Proyecto 45 min', tasks: 3, status: 'En progreso', tone: 'cyan' as const },
            { title: 'Cierre 5 min', tasks: 1, status: 'Siguiente', tone: 'neutral' as const },
          ],
        },
        sprint: {
          label: 'Deep work',
          metricPill: '1 tarea importante, primero',
          tableTitle: 'Día (Deep work)',
          tableRows: [
            { title: 'Prioridad #1', tasks: 1, status: 'Listo', tone: 'emerald' as const },
            { title: 'Reunión / update', tasks: 1, status: 'En progreso', tone: 'cyan' as const },
            { title: 'Cierre 5 min', tasks: 1, status: 'Siguiente', tone: 'neutral' as const },
          ],
        },
        light: {
          label: 'Suave',
          metricPill: 'Haz lo mínimo, gana el día',
          tableTitle: 'Día (Suave)',
          tableRows: [
            { title: '3 prioridades', tasks: 3, status: 'Listo', tone: 'emerald' as const },
            { title: '1 pendiente fácil', tasks: 1, status: 'En progreso', tone: 'cyan' as const },
            { title: 'Cierre 2 min', tasks: 1, status: 'Siguiente', tone: 'neutral' as const },
          ],
        },
      } satisfies Record<Preset, { label: string; metricPill: string; tableTitle: string; tableRows: { title: string; tasks: number; status: string; tone: 'emerald' | 'cyan' | 'neutral' }[] }>,
      }
    })()

    const pct = parseFirstInt(base.stat1Value)
    const count = parseFirstInt(base.stat2Value)
    const days = parseFirstInt(base.stat3Value)

    const pctDelta = energy === 'low' ? -12 : energy === 'high' ? 9 : 0
    const countDelta = energy === 'low' ? -1 : energy === 'high' ? 1 : 0
    const daysDelta = energy === 'low' ? -3 : energy === 'high' ? 4 : 0
    const weeklyDelta = energy === 'low' ? -16 : energy === 'high' ? 12 : 0
    const barScale = energy === 'low' ? 0.86 : energy === 'high' ? 1.12 : 1

    return {
      ...base,
      stat1Value: `+${clamp(pct + pctDelta, 6, 60)}%`,
      stat2Value: String(clamp(count + countDelta, 1, 6)),
      stat3Value: `${clamp(days + daysDelta, 1, 30)} días`,
      weeklyTargetPct: clamp(base.weeklyTargetPct + weeklyDelta, 35, 95),
      bars: base.bars.map((v) => clamp(Math.round(v * barScale), 4, 22)),
    }
  }, [useCase, energy])

  const activePreset = content.presets[preset]
  const energyHint =
    energy === 'high'
      ? 'Alta energía: más impulso y más avance'
      : energy === 'low'
        ? 'Baja energía: lo esencial, sin presión'
        : 'Energía media: ritmo constante'
  const demoItems = useMemo(
    () => activePreset.tableRows.map((r) => r.title).slice(0, 3),
    [activePreset.tableRows]
  )

  useEffect(() => {
    const id = window.setInterval(() => {
      setDemoStep((s) => {
        if (demoItems.length <= 0) return 0
        return s >= demoItems.length ? 0 : s + 1
      })
    }, 1100)
    return () => window.clearInterval(id)
  }, [useCase, preset, demoItems.length])

  const isDay = theme === 'day'
  const panelClass = isDay
    ? 'bg-white text-slate-900 ring-1 ring-slate-200'
    : 'bg-white/5 text-slate-50 ring-1 ring-white/10'
  const panelMutedText = isDay ? 'text-slate-600' : 'text-slate-300'
  const panelSoft = isDay ? 'bg-slate-50 ring-1 ring-slate-200' : 'bg-slate-950/40 ring-1 ring-white/10'
  const panelDivider = isDay ? 'bg-slate-200' : 'bg-white/10'

  const rootClass = isDay ? 'h-dvh overflow-hidden bg-slate-50 text-slate-900' : 'h-dvh overflow-hidden bg-slate-950 text-slate-50'
  const headerClass = isDay
    ? 'relative z-10 border-b border-slate-200 bg-white/70 backdrop-blur'
    : 'relative z-10 border-b border-white/10 bg-slate-950/50 backdrop-blur'
  const subtleText = isDay ? 'text-slate-600' : 'text-slate-300'
  const chipClass = isDay
    ? 'inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-xs ring-1 ring-slate-200'
    : 'inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15'
  const badgePillClass = isDay
    ? 'inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200'
    : 'inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-slate-200 ring-1 ring-white/10'
  const heroGradientClass = isDay
    ? 'bg-gradient-to-r from-cyan-700 to-violet-700 bg-clip-text text-transparent'
    : 'bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent'
  const secondaryCtaClass = isDay
    ? secondaryLinkClass + ' motion-safe:transition motion-safe:duration-300 hover:-translate-y-0.5'
    : secondaryLinkClass +
      ' bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15 motion-safe:transition motion-safe:duration-300 hover:-translate-y-0.5'
  const headerLoginClass = isDay
    ? secondaryLinkClass
    : secondaryLinkClass + ' bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15 focus:ring-white/30'

  const heroPillClass = isDay
    ? 'inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200'
    : 'inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-slate-200 ring-1 ring-white/10'

  const statCardClass = isDay
    ? 'bg-white p-3 ring-1 ring-slate-200 sm:p-4 motion-safe:transition motion-safe:duration-300 hover:bg-slate-50 hover:-translate-y-0.5'
    : 'bg-white/5 p-3 ring-1 ring-white/10 sm:p-4 motion-safe:transition motion-safe:duration-300 hover:bg-white/7 hover:-translate-y-0.5'

  const statLabelClass = isDay ? 'text-[11px] text-slate-600 sm:text-xs' : 'text-[11px] text-slate-300 sm:text-xs'

  const trustCardClass = isDay ? 'bg-white p-4 ring-1 ring-slate-200' : 'bg-white/5 p-4 ring-1 ring-white/10'
  const trustTextClass = isDay ? 'mt-1 text-sm text-slate-600' : 'mt-1 text-sm text-slate-300'

  return (
    <div className={rootClass}>
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={
            'absolute -top-24 left-1/2 h-72 w-[44rem] -translate-x-1/2 rounded-full blur-3xl ' +
            (isDay
              ? 'bg-gradient-to-r from-cyan-500/15 via-violet-500/10 to-fuchsia-500/10'
              : 'bg-gradient-to-r from-cyan-500/30 via-violet-500/20 to-fuchsia-500/20')
          }
        />
        <div className={"absolute -bottom-24 left-10 h-72 w-72 rounded-full blur-3xl " + (isDay ? 'bg-cyan-500/6' : 'bg-cyan-500/10')} />
        <div className={"absolute -bottom-24 right-10 h-72 w-72 rounded-full blur-3xl " + (isDay ? 'bg-violet-500/6' : 'bg-violet-500/10')} />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              isDay
                ? 'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.35) 1px, transparent 0)'
                : 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)',
            backgroundSize: '18px 18px',
          }}
        />
      </div>

      <header className={headerClass}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">NeuroRoutine</div>
              <div className={"text-xs " + subtleText}>Rutinas simples. Hábitos sostenibles.</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <Link
              to="/login"
              className={headerLoginClass}
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
            <div className={chipClass}>
              <span className={isDay ? 'text-slate-800' : 'text-white/90'}>Simple</span>
              <span className={isDay ? 'text-slate-400' : 'text-white/30'}>•</span>
              <span className={isDay ? 'text-slate-800' : 'text-white/90'}>Solo tú lo ves</span>
              <span className={isDay ? 'text-slate-400' : 'text-white/30'}>•</span>
              <span className={isDay ? 'text-slate-800' : 'text-white/90'}>Tu progreso, claro</span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className={badgePillClass}>
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" />
                {content.badge}
              </div>
              <div className="sm:hidden">
                <UseCaseTabs value={useCase} onChange={handleUseCaseChange} theme={theme} />
              </div>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
              Rutinas inteligentes,
              <span className={heroGradientClass}>
                {' '}
                progreso visible.
              </span>
            </h1>

            <p className={"mt-3 max-w-xl text-sm sm:mt-4 sm:text-lg " + subtleText}>
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
                className={secondaryCtaClass}
              >
                Ver mi dashboard
              </Link>

              <div className={"flex items-center gap-2 text-xs " + subtleText}>
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                Listo para empezar hoy
              </div>

              <div className={heroPillClass}>
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                {activePreset.metricPill}
              </div>
            </div>

            <div className={"mt-5 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-3 " + (isSwitching ? 'motion-safe:animate-pulse' : '')}>
              <Card className={statCardClass}>
                <div className={statLabelClass}>{content.stat1Label}</div>
                <div className="mt-0.5 text-base font-semibold sm:mt-1 sm:text-lg">{content.stat1Value}</div>
                <div className="mt-2 hidden sm:block">
                  <Sparkline />
                </div>
              </Card>

              <Card className={statCardClass}>
                <div className={statLabelClass}>{content.stat2Label}</div>
                <div className="mt-0.5 text-base font-semibold sm:mt-1 sm:text-lg">{content.stat2Value}</div>
                <div className="mt-2 hidden sm:block">
                  <MiniBars bars={content.bars} />
                </div>
              </Card>

              <Card className={statCardClass}>
                <div className={statLabelClass}>Streak</div>
                <div className="mt-0.5 text-base font-semibold sm:mt-1 sm:text-lg">{content.stat3Value}</div>
                <div className="mt-2 hidden items-center gap-3 sm:flex">
                  <div
                    className="h-12 w-12 rounded-full"
                    style={{
                      background:
                        `conic-gradient(rgba(34,211,238,0.9) 0 ${(content.weeklyTargetPct / 100) * 360}deg, rgba(255,255,255,0.12) ${(content.weeklyTargetPct / 100) * 360}deg 360deg)`,
                    }}
                  />
                  <div className={"text-xs " + (isDay ? 'text-slate-600' : 'text-slate-300')}>
                    Meta semanal
                    <div className={"text-sm font-semibold " + (isDay ? 'text-slate-900' : 'text-white')}>
                      {content.weeklyTargetPct}%
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="mt-5 hidden gap-3 sm:mt-6 sm:grid sm:grid-cols-2">
              <Card className={trustCardClass}>
                <div className="text-sm font-semibold">Tu espacio es tuyo</div>
                <div className={trustTextClass}>
                  Tus rutinas y tu progreso se mantienen privados.
                </div>
              </Card>
              <Card className={trustCardClass}>
                <div className="text-sm font-semibold">Entra como prefieras</div>
                <div className={trustTextClass}>
                  Accede con tu usuario, tu email o Google.
                </div>
              </Card>
            </div>
          </div>

          {/* Right: dashboard preview (hidden on small screens to prevent scroll) */}
          <div className="hidden lg:col-span-5 lg:block">
            <div className={"h-full rounded-2xl p-5 " + panelClass}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Vista previa</div>
                  <div className={"text-xs " + panelMutedText}>Elige un caso y mira cómo se ve</div>
                </div>
                <UseCaseTabs value={useCase} onChange={handleUseCaseChange} />
              </div>

              <div className="mt-4 grid gap-3">
                <div className={"rounded-xl p-4 " + panelSoft}>
                  <div className="flex items-center justify-between">
                    <div className={"text-xs " + panelMutedText}>{activePreset.tableTitle}</div>
                    <div className={"text-xs " + panelMutedText}>Hoy</div>
                  </div>

                  <div className={"mt-3 overflow-hidden rounded-lg ring-1 " + (isDay ? 'ring-slate-200' : 'ring-white/10')}>
                    <table className="w-full text-left text-xs">
                      <thead className={isDay ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-slate-300'}>
                        <tr>
                          <th className="px-3 py-2 font-medium">Título</th>
                          <th className="px-3 py-2 font-medium">Tareas</th>
                          <th className="px-3 py-2 font-medium">Estado</th>
                        </tr>
                      </thead>
                      <tbody className={"divide-y " + (isDay ? 'divide-slate-200 text-slate-900' : 'divide-white/10 text-slate-200')}>
                        {activePreset.tableRows.map((r) => (
                          <tr key={r.title} className={isSwitching ? 'opacity-70' : 'opacity-100'}>
                            <td className="px-3 py-2">{r.title}</td>
                            <td className="px-3 py-2">{r.tasks}</td>
                            <td className="px-3 py-2">
                              {r.tone === 'emerald' ? (
                                <span
                                  className={
                                    'rounded-full px-2 py-0.5 ring-1 ' +
                                    (isDay
                                      ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20'
                                      : 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/20')
                                  }
                                >
                                  {r.status}
                                </span>
                              ) : r.tone === 'cyan' ? (
                                <span
                                  className={
                                    'rounded-full px-2 py-0.5 ring-1 ' +
                                    (isDay
                                      ? 'bg-cyan-500/10 text-cyan-700 ring-cyan-500/20'
                                      : 'bg-cyan-400/15 text-cyan-200 ring-cyan-400/20')
                                  }
                                >
                                  {r.status}
                                </span>
                              ) : (
                                <span
                                  className={
                                    'rounded-full px-2 py-0.5 ring-1 ' +
                                    (isDay
                                      ? 'bg-slate-900/5 text-slate-700 ring-slate-300'
                                      : 'bg-white/10 text-slate-200 ring-white/10')
                                  }
                                >
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
                  <div className={"rounded-xl p-4 " + panelSoft}>
                    <div className={"text-xs " + panelMutedText}>Avance</div>
                    <div className="mt-1 text-base font-semibold">Se siente mejor</div>
                    <div className={"mt-3 h-2 rounded-full " + panelDivider}>
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 motion-safe:transition-all motion-safe:duration-300"
                        style={{ width: `${content.weeklyTargetPct}%` }}
                      />
                    </div>
                    <div className={"mt-2 text-xs " + panelMutedText}>{energyHint}</div>
                  </div>
                  <div className={"rounded-xl p-4 " + panelSoft}>
                    <div className={"text-xs " + panelMutedText}>Hoy</div>
                    <div className="mt-1 text-base font-semibold">Hecho es mejor</div>
                    <div className="mt-3 flex gap-2">
                      <div className="h-6 flex-1 rounded-md bg-cyan-400/25 ring-1 ring-cyan-400/20" />
                      <div className="h-6 flex-1 rounded-md bg-violet-400/25 ring-1 ring-violet-400/20" />
                      <div className={"h-6 flex-1 rounded-md ring-1 " + (isDay ? 'bg-slate-900/5 ring-slate-200' : 'bg-white/10 ring-white/10')} />
                    </div>
                    <div className={"mt-2 text-xs " + panelMutedText}>{energyHint}</div>
                  </div>
                </div>

                <div className={"rounded-xl p-3 " + (isDay ? 'bg-slate-50 ring-1 ring-slate-200' : 'bg-white/5 ring-1 ring-white/10')}>
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: animated checklist simulation */}
                    <div className="min-w-0">
                      <div className={"text-xs font-medium " + panelMutedText}>Marcando progreso</div>
                      <ul className="mt-2 space-y-1.5">
                        {demoItems.map((label, idx) => {
                          const checked = idx < demoStep
                          return (
                            <li key={label} className="flex items-center gap-2">
                              <span
                                className={
                                  'inline-flex h-5 w-5 items-center justify-center rounded-md ring-1 motion-safe:transition motion-safe:duration-300 ' +
                                  (checked
                                    ? isDay
                                      ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20'
                                      : 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/20'
                                    : isDay
                                      ? 'bg-slate-900/5 text-slate-500 ring-slate-200'
                                      : 'bg-slate-950/30 text-slate-400 ring-white/10')
                                }
                                aria-hidden="true"
                              >
                                {checked ? (
                                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
                                    <path
                                      d="M20 7L10 17l-5-5"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                ) : (
                                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                                )}
                              </span>
                              <span
                                className={
                                  'truncate text-xs motion-safe:transition motion-safe:duration-300 ' +
                                  (checked
                                    ? isDay
                                      ? 'text-slate-900'
                                      : 'text-slate-50'
                                    : isDay
                                      ? 'text-slate-600'
                                      : 'text-slate-300')
                                }
                              >
                                {label}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>

                    {/* Right: energy + weekly */}
                    <div className="shrink-0">
                      <div className={"text-[11px] " + panelMutedText}>Energía</div>
                      <div
                        className={
                          'mt-1 inline-flex rounded-lg p-1 ring-1 ' +
                          (isDay ? 'bg-white ring-slate-200' : 'bg-slate-950/30 ring-white/10')
                        }
                        role="group"
                        aria-label="Nivel de energía"
                      >
                        {(
                          [
                            { key: 'low' as const, label: 'Baja' },
                            { key: 'medium' as const, label: 'Media' },
                            { key: 'high' as const, label: 'Alta' },
                          ]
                        ).map((opt) => {
                          const selected = energy === opt.key
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                setEnergy(opt.key)
                                setPreset(presetForEnergy(opt.key))
                                setDemoStep(0)
                              }}
                              className={
                                'rounded-md px-2 py-1 text-[11px] font-medium motion-safe:transition motion-safe:duration-200 ' +
                                (selected
                                  ? isDay
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-white/10 text-white'
                                  : isDay
                                    ? 'text-slate-600 hover:bg-slate-900/5 hover:text-slate-900'
                                    : 'text-slate-300 hover:bg-white/5 hover:text-white')
                              }
                              aria-pressed={selected}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>

                      <div className="mt-2">
                        <div className={"flex items-center justify-between text-[11px] " + panelMutedText}>
                          <span>Esta semana</span>
                          <span className={isDay ? 'text-slate-500' : 'text-slate-400'}>
                            {content.weeklyTargetPct}%
                          </span>
                        </div>
                        <div className={"mt-1 h-1.5 w-36 rounded-full " + panelDivider}>
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 motion-safe:transition-all motion-safe:duration-300"
                            style={{ width: `${content.weeklyTargetPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
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
