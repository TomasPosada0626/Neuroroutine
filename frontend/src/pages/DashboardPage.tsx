import { RoutinePanel } from '@/features/routines/components/RoutinePanel'
import { AppShell } from '@/shared/layout'

export function DashboardPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <div className="text-2xl font-semibold">Dashboard</div>
        <div className="text-sm text-slate-600">Rutinas y tareas, sin fricción</div>
      </div>
      <RoutinePanel />
    </AppShell>
  )
}
