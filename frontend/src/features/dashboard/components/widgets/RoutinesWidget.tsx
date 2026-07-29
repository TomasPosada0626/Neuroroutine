import { WidgetCardShell } from '@/features/dashboard/components/WidgetCardShell';
import { Button } from '@/shared/ui';
import type { DashboardWidgetId } from '@/shared/state/dashboardPrefsStore';
import type { Routine, RoutineTask } from '@/shared/types/routines';

type Props = {
  loading: boolean;
  routines: Routine[];
  tasksByRoutineId: Record<string, RoutineTask[]>;
  onStartSession: (routineId: string | null) => void;
  isDay: boolean;
  subtleText: string;
  panelText: string;
  collapsed: boolean;
  onToggleCollapsed: (id: DashboardWidgetId) => void;
};

export function RoutinesWidget({
  loading,
  routines,
  tasksByRoutineId,
  onStartSession,
  isDay,
  subtleText,
  panelText,
  collapsed,
  onToggleCollapsed,
}: Props) {
  return (
    <WidgetCardShell
      id="routines"
      title="Rutinas"
      subtitle="Acceso rápido."
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      subtleText={subtleText}
    >
      {loading ? (
        <div className="grid gap-2">
          <div
            className={
              'h-12 animate-pulse rounded-lg ring-1 ' +
              (isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')
            }
          />
          <div
            className={
              'h-12 animate-pulse rounded-lg ring-1 ' +
              (isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')
            }
          />
        </div>
      ) : routines.length === 0 ? (
        // No second "create" button here on purpose: "Nueva rutina" at the top of the page is
        // already the one call to action for an empty account, this just points back to it.
        <div className={'text-sm ' + subtleText}>
          Tus rutinas aparecerán aquí. Usa “Nueva rutina” arriba para crear la primera.
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="space-y-2">
            {routines.slice(0, 3).map((r) => {
              const tasks = tasksByRoutineId[r.id] ?? [];
              const done = tasks.filter((t) => t.is_done).length;
              const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
              return (
                <button
                  key={r.id}
                  type="button"
                  className={
                    'w-full rounded-lg p-3 text-left ring-1 transition ' +
                    (isDay
                      ? 'bg-white ring-slate-200 hover:bg-slate-50'
                      : 'bg-white/5 ring-white/10 hover:bg-white/10')
                  }
                  onClick={() => onStartSession(r.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className={'text-sm font-medium ' + panelText}>{r.title}</div>
                    <div className={'text-xs ' + subtleText}>{pct}%</div>
                  </div>
                  <div className={'mt-1 text-xs ' + subtleText}>
                    {tasks.length} tareas • {done} hechas
                  </div>
                  <div
                    className={
                      'mt-2 h-1.5 w-full rounded-full ' + (isDay ? 'bg-slate-200' : 'bg-white/10')
                    }
                  >
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className={'text-xs ' + subtleText}>Abre una rutina para marcar tareas.</div>
            <Button variant="secondary" onClick={() => onStartSession(null)}>
              Ver todas
            </Button>
          </div>
        </div>
      )}
    </WidgetCardShell>
  );
}
