import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'
import { Button } from '@/shared/ui'
import { useUiStore } from '@/shared/state/uiStore'
import { ThemeToggle } from '@/shared/ui/ThemeToggle'
import { SchemaBanner } from '@/shared/schema/SchemaBanner'
import { useSchemaStore } from '@/shared/schema/schemaStore'

type AppShellProps = PropsWithChildren<{
  userId?: string | null
  userEmail?: string | null
  onSignOut?: () => void | Promise<void>
}>

export function AppShell({ children, userId, userEmail, onSignOut }: AppShellProps) {
  const theme = useUiStore((s) => s.theme)
  const isDay = theme === 'day'
  const hydrateSchema = useSchemaStore((s) => s.hydrateFromCache)
  const refreshSchema = useSchemaStore((s) => s.refresh)

  useEffect(() => {
    hydrateSchema()
  }, [hydrateSchema])

  useEffect(() => {
    if (!userId) return
    void refreshSchema()
  }, [userId, refreshSchema])

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
            <div className={"hidden text-xs sm:block " + subtleText}>{userEmail}</div>
            <ThemeToggle compact />
            <Button variant="secondary" onClick={() => void onSignOut?.()}>
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="space-y-4">
          <SchemaBanner />
          {children}
        </div>
      </main>
    </div>
  )
}
