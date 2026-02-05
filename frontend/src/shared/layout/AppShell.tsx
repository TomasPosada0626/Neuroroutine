import type { PropsWithChildren } from 'react'
import { useAuth } from '@/features/auth/authStore'
import { Button } from '@/shared/ui'

export function AppShell({ children }: PropsWithChildren) {
  const { user, signOut } = useAuth()

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
          <div className="flex items-center gap-3">
            <div className="hidden text-xs text-slate-500 sm:block">{user?.email}</div>
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
