import type { PropsWithChildren, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'

type Props = PropsWithChildren<{
  title: string
  subtitle?: string
  badge?: string
  footer?: ReactNode
  className?: string
}>

export function AuthShell({ title, subtitle, badge, footer, className, children }: Props) {
  return (
    <div className={cn('min-h-dvh bg-slate-950 text-slate-50', className)}>
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

      <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-12">
        {/* Left */}
        <div className="lg:col-span-6">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">NeuroRoutine</div>
              <div className="text-xs text-slate-300">Rutinas simples, hábitos sostenibles</div>
            </div>
          </Link>

          {badge ? (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" />
              {badge}
            </div>
          ) : null}

          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-md text-sm text-slate-300 sm:text-base">{subtitle}</p> : null}

          <div className="mt-6 hidden max-w-md grid-cols-2 gap-3 sm:grid">
            <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="text-xs text-slate-300">Login flexible</div>
              <div className="mt-1 text-sm font-semibold">Usuario o email</div>
            </div>
            <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="text-xs text-slate-300">Privacidad real</div>
              <div className="mt-1 text-sm font-semibold">RLS por usuario</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">Supabase Auth</span>
            <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">Postgres + RLS</span>
            <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">Vite + React + TS</span>
            <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">Tailwind</span>
          </div>
        </div>

        {/* Right */}
        <div className="lg:col-span-6">{children}</div>

        {footer ? <div className="lg:col-span-12">{footer}</div> : null}
      </div>
    </div>
  )
}
