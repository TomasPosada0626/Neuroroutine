import type { PropsWithChildren } from 'react'
import { useAuth } from '@/features/auth/authStore'
import { Button } from '@/shared/ui'
import { useUiStore } from '@/shared/state/uiStore'
import { ThemeToggle } from '@/shared/ui/ThemeToggle'

export function AppShell({ children }: PropsWithChildren) {
  const { user, signOut } = useAuth()
  const theme = useUiStore((s) => s.theme)
  const isDay = theme === 'day'

  const rootClass = isDay ? 'min-h-dvh bg-slate-50 text-slate-900' : 'min-h-dvh bg-slate-950 text-slate-50'
  const headerClass = isDay
    ? 'sticky top-0 z-10 border-b border-slate-200 bg-white/70 backdrop-blur'
    : 'sticky top-0 z-10 border-b border-white/10 bg-slate-950/50 backdrop-blur'
  const subtleText = isDay ? 'text-slate-500' : 'text-slate-300'
  const logoClass = isDay ? 'h-8 w-8 rounded-lg bg-slate-900' : 'h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500'

  return (
    <div className={rootClass}>
      <header className={headerClass}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className={logoClass} />
            <div className="leading-tight">
              <div className="text-sm font-semibold">NeuroRoutine</div>
              <div className={"text-xs " + subtleText}>Rutinas simples, hábitos sostenibles</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={"hidden text-xs sm:block " + subtleText}>{user?.email}</div>
            <ThemeToggle compact />
            <Button variant="secondary" onClick={() => signOut()}>
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
