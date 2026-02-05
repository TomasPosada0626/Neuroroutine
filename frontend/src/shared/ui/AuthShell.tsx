import type { PropsWithChildren, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { useUiStore } from '@/shared/state/uiStore'
import { ThemeToggle } from '@/shared/ui/ThemeToggle'

type Props = PropsWithChildren<{
  title: string
  subtitle?: string
  badge?: string
  footer?: ReactNode
  className?: string
}>

export function AuthShell({ title, subtitle, badge, footer, className, children }: Props) {
  const theme = useUiStore((s) => s.theme)
  const isDay = theme === 'day'

  const rootClass = isDay ? 'min-h-dvh bg-slate-50 text-slate-900' : 'min-h-dvh bg-slate-950 text-slate-50'
  const subtleText = isDay ? 'text-slate-600' : 'text-slate-300'
  const cardClass = isDay ? 'rounded-xl bg-white/70 p-4 ring-1 ring-slate-200' : 'rounded-xl bg-white/5 p-4 ring-1 ring-white/10'
  const chipClass = isDay
    ? 'rounded-full bg-white/70 px-2 py-1 ring-1 ring-slate-200'
    : 'rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10'

  const backClass = isDay
    ? 'inline-flex items-center gap-2 rounded-lg bg-white/70 px-2.5 py-2 text-xs font-medium text-slate-800 ring-1 ring-slate-200 hover:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/25'
    : 'inline-flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-2 text-xs font-medium text-slate-100 ring-1 ring-white/15 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30'

  return (
    <div className={cn(rootClass, className)}>
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

      <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-12">
        {/* Left */}
        <div className="lg:col-span-6">
          <div className="flex items-start justify-between gap-3">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500" />
              <div className="leading-tight">
                <div className="text-sm font-semibold">NeuroRoutine</div>
                <div className={cn('text-xs', subtleText)}>Rutinas simples. Hábitos sostenibles.</div>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/" className={backClass} aria-label="Volver a la landing">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Volver
              </Link>
              <ThemeToggle compact />
            </div>
          </div>

          {badge ? (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" />
              {badge}
            </div>
          ) : null}

          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle ? <p className={cn('mt-2 max-w-md text-sm sm:text-base', subtleText)}>{subtitle}</p> : null}

          <div className="mt-6 hidden max-w-md grid-cols-2 gap-3 sm:grid">
            <div className={cardClass}>
              <div className={cn('text-xs', subtleText)}>Entra y continúa</div>
              <div className="mt-1 text-sm font-semibold">Retoma tu plan en segundos</div>
            </div>
            <div className={cardClass}>
              <div className={cn('text-xs', subtleText)}>Sin presión</div>
              <div className="mt-1 text-sm font-semibold">Paso a paso, pero sin parar</div>
            </div>
          </div>

          <div className={cn('mt-6 flex flex-wrap items-center gap-2 text-xs', subtleText)}>
            <span className={chipClass}>Entra en segundos</span>
            <span className={chipClass}>Prioridades claras</span>
            <span className={chipClass}>Progreso semanal</span>
            <span className={chipClass}>Tu espacio, solo tuyo</span>
          </div>
        </div>

        {/* Right */}
        <div className="lg:col-span-6">{children}</div>

        {footer ? <div className="lg:col-span-12">{footer}</div> : null}
      </div>
    </div>
  )
}
