import { RoutinePanel } from '@/features/routines/components/RoutinePanel'
import { AppShell } from '@/shared/layout'
import { useUiStore } from '@/shared/state/uiStore'

export function DashboardPage() {
  const theme = useUiStore((s) => s.theme)
  const isDay = theme === 'day'
  const subtleText = isDay ? 'text-slate-600' : 'text-slate-300'
  const iconBoxClass = isDay ? 'bg-cyan-600' : 'bg-cyan-500'

  return (
    <AppShell>
      <div className="mb-6 flex items-start gap-3">
        <div className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' + iconBoxClass}>
          {/* Recommended icon: checklist / habits */}
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 6h11" />
            <path d="M9 12h11" />
            <path d="M9 18h11" />
            <path d="M4 6l1 1 2-2" />
            <path d="M4 12l1 1 2-2" />
            <path d="M4 18l1 1 2-2" />
          </svg>
        </div>
        <div>
          <div className="text-2xl font-semibold">Mi progreso</div>
          <div className={'text-sm ' + subtleText}>Rutinas y tareas, sin fricción</div>
        </div>
      </div>
      <RoutinePanel />
    </AppShell>
  )
}
