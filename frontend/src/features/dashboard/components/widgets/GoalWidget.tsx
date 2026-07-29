import { WidgetCardShell } from '@/features/dashboard/components/WidgetCardShell';
import { computeWeekCounts } from '@/features/dashboard/utils/dashboardUtils';
import type { DashboardWidgetId } from '@/shared/state/dashboardPrefsStore';

type Props = {
  weeklyGoal: number;
  weekCounts: ReturnType<typeof computeWeekCounts>;
  weeklyProgressPct: number;
  isDay: boolean;
  subtleText: string;
  panelText: string;
  collapsed: boolean;
  onToggleCollapsed: (id: DashboardWidgetId) => void;
};

export function GoalWidget({
  weeklyGoal,
  weekCounts,
  weeklyProgressPct,
  isDay,
  subtleText,
  panelText,
  collapsed,
  onToggleCollapsed,
}: Props) {
  return (
    <WidgetCardShell
      id="goal"
      title="Meta semanal"
      subtitle={`Objetivo: ${weeklyGoal} tareas/semana.`}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      subtleText={subtleText}
    >
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className={'text-xs ' + subtleText}>Esta semana</div>
            <div
              className={'mt-1 text-xl font-semibold ' + (isDay ? 'text-slate-900' : 'text-white')}
            >
              {weekCounts.thisWeekCompleted} / {weeklyGoal}
            </div>
          </div>
          <div className={'text-xs ' + subtleText}>
            vs anterior: {weekCounts.prevWeekCompleted} ({Math.round(weekCounts.deltaPct)}%)
          </div>
        </div>

        <div className={'h-2 w-full rounded-full ' + (isDay ? 'bg-slate-200' : 'bg-white/10')}>
          <div
            className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
            style={{ width: `${Math.max(0, Math.min(100, weeklyProgressPct))}%` }}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div
            className={
              'rounded-lg p-3 ring-1 ' +
              (isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')
            }
          >
            <div className={'text-xs ' + subtleText}>Consistencia</div>
            <div className={'mt-1 text-sm font-medium ' + panelText}>
              {Math.round(weekCounts.consistencyThis)}% de días activos
            </div>
          </div>
          <div
            className={
              'rounded-lg p-3 ring-1 ' +
              (isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')
            }
          >
            <div className={'text-xs ' + subtleText}>Recomendación</div>
            <div className={'mt-1 text-sm font-medium ' + panelText}>
              {weekCounts.thisWeekCompleted === 0
                ? 'Haz 1 tarea hoy para arrancar.'
                : 'Mantén el ritmo con una sesión corta.'}
            </div>
          </div>
        </div>
      </div>
    </WidgetCardShell>
  );
}
