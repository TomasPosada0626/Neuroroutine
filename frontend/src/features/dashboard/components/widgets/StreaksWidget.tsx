import { WidgetCardShell } from '@/features/dashboard/components/WidgetCardShell';
import { computeStreaks } from '@/features/dashboard/utils/dashboardUtils';
import type { DashboardWidgetId } from '@/shared/state/dashboardPrefsStore';

type Props = {
  streaks: ReturnType<typeof computeStreaks>;
  isDay: boolean;
  subtleText: string;
  collapsed: boolean;
  onToggleCollapsed: (id: DashboardWidgetId) => void;
};

export function StreaksWidget({ streaks, isDay, subtleText, collapsed, onToggleCollapsed }: Props) {
  return (
    <WidgetCardShell
      id="streaks"
      title="Rachas"
      subtitle="Consistencia en días con actividad."
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      subtleText={subtleText}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div
          className={
            'rounded-lg p-3 ring-1 ' +
            (isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')
          }
        >
          <div className={'text-xs ' + subtleText}>Racha actual</div>
          <div
            className={'mt-1 text-2xl font-semibold ' + (isDay ? 'text-slate-900' : 'text-white')}
          >
            {streaks.current}
          </div>
          <div className={'mt-1 text-xs ' + subtleText}>
            {streaks.hasToday ? 'Ya sumaste hoy' : 'Aún no sumas hoy'}
          </div>
        </div>
        <div
          className={
            'rounded-lg p-3 ring-1 ' +
            (isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')
          }
        >
          <div className={'text-xs ' + subtleText}>Mejor racha</div>
          <div
            className={'mt-1 text-2xl font-semibold ' + (isDay ? 'text-slate-900' : 'text-white')}
          >
            {streaks.best}
          </div>
          <div className={'mt-1 text-xs ' + subtleText}>Tu récord histórico</div>
        </div>
        <div className={'sm:col-span-2 text-xs ' + subtleText}>
          Un día perdido no borra tu racha actual — solo dos días seguidos sin actividad la
          reinician.
        </div>
      </div>
    </WidgetCardShell>
  );
}
