import type { PropsWithChildren } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/authStore'
import { Button } from '@/shared/ui'
import { useUiStore } from '@/shared/state/uiStore'
import { ThemeToggle } from '@/shared/ui/ThemeToggle'

export function AppShell({ children }: PropsWithChildren) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const theme = useUiStore((s) => s.theme)
  const isDay = theme === 'day'

  // Slightly lighter than the landing page in night mode.
  const rootClass = isDay
    ? 'min-h-dvh overflow-x-hidden bg-slate-50 text-slate-900'
    : 'min-h-dvh overflow-x-hidden bg-slate-900 text-slate-50'
  const headerClass = isDay
    ? 'sticky top-0 z-10 border-b border-slate-200 bg-white/70 backdrop-blur'
    : 'sticky top-0 z-10 border-b border-white/10 bg-slate-900/60 backdrop-blur'
  const subtleText = isDay ? 'text-slate-500' : 'text-slate-300'
  const logoClass = isDay
    ? 'grid h-8 w-8 place-items-center overflow-hidden rounded-lg bg-slate-900'
    : 'grid h-8 w-8 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500'

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className={rootClass}>
      <header className={headerClass}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className={logoClass} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="white"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Checklist / habits icon */}
                <path d="M9 6h11" />
                <path d="M9 12h11" />
                <path d="M9 18h11" />
                <path d="M4 6l1 1 2-2" />
                <path d="M4 12l1 1 2-2" />
                <path d="M4 18l1 1 2-2" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">NeuroRoutine</div>
              <div className={"text-xs " + subtleText}>Rutinas simples. Hábitos sostenibles.</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={"hidden text-xs sm:block " + subtleText}>{user?.email}</div>
            <ThemeToggle compact />
            <Button variant="secondary" onClick={handleSignOut}>
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
