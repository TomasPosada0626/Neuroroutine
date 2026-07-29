import { WidgetCardShell } from '@/features/dashboard/components/WidgetCardShell';
import { computeHeatmap } from '@/features/dashboard/utils/dashboardAnalytics';
import { cn } from '@/shared/lib/cn';
import type { DashboardWidgetId } from '@/shared/state/dashboardPrefsStore';

type Props = {
  loading: boolean;
  heatmap: ReturnType<typeof computeHeatmap>;
  isDay: boolean;
  subtleText: string;
  collapsed: boolean;
  onToggleCollapsed: (id: DashboardWidgetId) => void;
};

export function AnalyticsSummaryWidget({
  loading,
  heatmap,
  isDay,
  subtleText,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const totalChecks = heatmap.counts.reduce((s, x) => (x.inRange ? s + x.count : s), 0);
  const activeDays = heatmap.counts.reduce((s, x) => (x.inRange && x.count > 0 ? s + 1 : s), 0);
  const tileClass = cn(
    'rounded-lg p-3 ring-1',
    isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
  );

  return (
    <WidgetCardShell
      id="analytics"
      title="Analítica"
      subtitle="KPIs y tendencias."
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      subtleText={subtleText}
    >
      {loading ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className={cn('h-16 animate-pulse rounded-lg ring-1', tileClass)} />
          <div className={cn('h-16 animate-pulse rounded-lg ring-1', tileClass)} />
        </div>
      ) : (
        <div className="grid gap-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className={tileClass}>
              <div className={'text-xs ' + subtleText}>Checks (rango)</div>
              <div
                className={
                  'mt-1 text-lg font-semibold ' + (isDay ? 'text-slate-900' : 'text-white')
                }
              >
                {totalChecks}
              </div>
            </div>
            <div className={tileClass}>
              <div className={'text-xs ' + subtleText}>Días activos</div>
              <div
                className={
                  'mt-1 text-lg font-semibold ' + (isDay ? 'text-slate-900' : 'text-white')
                }
              >
                {activeDays}
              </div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className={tileClass}>
              <div className={'text-xs ' + subtleText}>Racha</div>
              <div
                className={
                  'mt-1 text-lg font-semibold ' + (isDay ? 'text-slate-900' : 'text-white')
                }
              >
                {heatmap.streak}d
              </div>
            </div>
            <div className={tileClass}>
              <div className={'text-xs ' + subtleText}>Mejor</div>
              <div
                className={
                  'mt-1 text-lg font-semibold ' + (isDay ? 'text-slate-900' : 'text-white')
                }
              >
                {heatmap.best}d
              </div>
            </div>
          </div>
          <div className={'text-xs ' + subtleText}>
            Desplázate hacia abajo para ver gráficos detallados.
          </div>
        </div>
      )}
    </WidgetCardShell>
  );
}
