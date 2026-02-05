import type { PropsWithChildren, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { useUiStore } from '@/shared/state/uiStore'

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
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">NeuroRoutine</div>
              <div className={cn('text-xs', subtleText)}>Rutinas simples, hábitos sostenibles</div>
            </div>
          </Link>

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
              <div className={cn('text-xs', subtleText)}>Entra y sigue</div>
              <div className="mt-1 text-sm font-semibold">Tu rutina te espera</div>
            </div>
            <div className={cardClass}>
              <div className={cn('text-xs', subtleText)}>Sin presión</div>
              <div className="mt-1 text-sm font-semibold">Pequeños pasos cada día</div>
            </div>
          </div>

          <div className={cn('mt-6 flex flex-wrap items-center gap-2 text-xs', subtleText)}>
            <span className={chipClass}>Empieza en minutos</span>
            <span className={chipClass}>Diseño simple</span>
            <span className={chipClass}>Progreso visible</span>
            <span className={chipClass}>Tu espacio privado</span>
          </div>
        </div>

        {/* Right */}
        <div className="lg:col-span-6">{children}</div>

        {footer ? <div className="lg:col-span-12">{footer}</div> : null}
      </div>
    </div>
  )
}
