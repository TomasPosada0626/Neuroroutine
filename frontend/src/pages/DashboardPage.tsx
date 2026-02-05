import { RoutinePanel } from '@/features/routines/components/RoutinePanel'
import { AppShell } from '@/shared/layout'
import { useUiStore } from '@/shared/state/uiStore'

export function DashboardPage() {
  const theme = useUiStore((s) => s.theme)
  const isDay = theme === 'day'
  const subtleText = isDay ? 'text-slate-600' : 'text-slate-300'

  return (
    <AppShell>
      <div className="mb-6">
        <div className="text-2xl font-semibold">Mi progreso</div>
        <div className={'text-sm ' + subtleText}>Rutinas y tareas, sin fricción</div>
      </div>
      <RoutinePanel />
    </AppShell>
  )
}
