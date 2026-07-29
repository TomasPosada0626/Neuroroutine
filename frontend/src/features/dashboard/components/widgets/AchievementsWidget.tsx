import { WidgetCardShell } from '@/features/dashboard/components/WidgetCardShell';
import { buildAchievements } from '@/features/dashboard/utils/dashboardAnalytics';
import type { DashboardWidgetId } from '@/shared/state/dashboardPrefsStore';

type Props = {
  achievements: ReturnType<typeof buildAchievements>;
  isDay: boolean;
  subtleText: string;
  panelText: string;
  collapsed: boolean;
  onToggleCollapsed: (id: DashboardWidgetId) => void;
};

export function AchievementsWidget({
  achievements,
  isDay,
  subtleText,
  panelText,
  collapsed,
  onToggleCollapsed,
}: Props) {
  return (
    <WidgetCardShell
      id="achievements"
      title="Logros"
      subtitle="Pequeñas victorias que suman."
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      subtleText={subtleText}
    >
      <div className="grid gap-2">
        {achievements.map((a) => (
          <div
            key={a.id}
            className={
              'flex items-center justify-between gap-3 rounded-lg p-3 ring-1 ' +
              (isDay ? 'bg-white ring-slate-200' : 'bg-white/5 ring-white/10')
            }
          >
            <div>
              <div className={'text-sm font-medium ' + panelText}>{a.title}</div>
              <div className={'text-xs ' + subtleText}>{a.desc}</div>
            </div>
            <div
              className={
                'text-xs ' +
                (a.earned ? (isDay ? 'text-emerald-600' : 'text-emerald-300') : subtleText)
              }
            >
              {a.earned ? 'Logrado' : 'Pendiente'}
            </div>
          </div>
        ))}
      </div>
    </WidgetCardShell>
  );
}
