import { WidgetCardShell } from '@/features/dashboard/components/WidgetCardShell';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui';
import type { DashboardWidgetId } from '@/shared/state/dashboardPrefsStore';
import type { Routine, RoutineTask } from '@/shared/types/routines';

type Props = {
  riskText: string;
  lastActivity: Date | null;
  scheduledToday: Routine[];
  tasksByRoutineId: Record<string, RoutineTask[]>;
  onStartSession: (routineId: string | null) => void;
  onCustomize: () => void;
  todayFocus: RoutineTask[];
  routines: Routine[];
  offline: boolean;
  onSetTaskDone: (input: { id: string; routine_id: string; is_done: boolean }) => void;
  routineTitleById: Map<string, string>;
  isDay: boolean;
  subtleText: string;
  panelText: string;
  collapsed: boolean;
  onToggleCollapsed: (id: DashboardWidgetId) => void;
};

export function TodayWidget({
  riskText,
  lastActivity,
  scheduledToday,
  tasksByRoutineId,
  onStartSession,
  onCustomize,
  todayFocus,
  routines,
  offline,
  onSetTaskDone,
  routineTitleById,
  isDay,
  subtleText,
  panelText,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const tileClass = cn(
    'rounded-lg p-3 ring-1',
    isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
  );

  return (
    <WidgetCardShell
      id="today"
      title="Hoy"
      subtitle="Tu foco inmediato: sesión + 1 tarea."
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      subtleText={subtleText}
      className="lg:col-span-2"
    >
      <div className="space-y-3">
        <div className={tileClass}>
          <div className={'text-xs ' + subtleText}>Riesgo</div>
          <div className={'mt-1 text-sm font-medium ' + panelText}>{riskText}</div>
        </div>

        <div className={tileClass}>
          <div className={'text-xs ' + subtleText}>Última actividad</div>
          <div className={'mt-1 text-sm font-medium ' + panelText}>
            {lastActivity ? lastActivity.toLocaleString() : '—'}
          </div>
        </div>

        {scheduledToday.length > 0 ? (
          <div className={tileClass}>
            <div className={'text-xs ' + subtleText}>Rutinas programadas</div>
            <div className="mt-2 space-y-2">
              {scheduledToday.map((r) => {
                const tasks = tasksByRoutineId[r.id] ?? [];
                const done = tasks.filter((t) => t.is_done).length;
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3">
                    <div>
                      <div className={'text-sm font-medium ' + panelText}>{r.title}</div>
                      <div className={'text-xs ' + subtleText}>
                        {tasks.length} tareas • {done} hechas
                      </div>
                    </div>
                    <Button variant="secondary" onClick={() => onStartSession(r.id)}>
                      Empezar
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={tileClass}>
            <div className={'text-xs ' + subtleText}>Rutinas programadas</div>
            <div className={'mt-1 text-sm ' + panelText}>
              Aún no has programado rutinas para hoy.
            </div>
            <div className="mt-2">
              <Button variant="secondary" onClick={onCustomize}>
                Programar
              </Button>
            </div>
          </div>
        )}

        {todayFocus.length === 0 ? (
          <div
            className={
              'rounded-lg p-3 ring-1 ' +
              (isDay ? 'bg-white ring-slate-200' : 'bg-white/5 ring-white/10')
            }
          >
            <div className={'text-sm ' + panelText}>
              {routines.length === 0
                ? 'Crea tu primera rutina para empezar.'
                : 'No hay pendientes recientes. Puedes abrir una rutina y marcar una tarea para sumar hoy.'}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {todayFocus.slice(0, 6).map((t) => (
              <button
                key={t.id}
                type="button"
                className={
                  'flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left ring-1 transition ' +
                  (isDay
                    ? 'bg-white ring-slate-200 hover:bg-slate-50'
                    : 'bg-white/5 ring-white/10 hover:bg-white/7')
                }
                onClick={() =>
                  onSetTaskDone({ id: t.id, routine_id: t.routine_id, is_done: !t.is_done })
                }
                disabled={offline}
              >
                <div className="flex items-center gap-3">
                  {/* Decorative status indicator, not a real form control: the whole row is
                      already a <button> that toggles completion, so a nested <input> here
                      would be a real (and, per axe, unfixable-via-aria-hidden) nested
                      interactive control. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid h-4 w-4 flex-shrink-0 place-items-center rounded border',
                      t.is_done
                        ? isDay
                          ? 'border-slate-900 bg-slate-900'
                          : 'border-cyan-300 bg-cyan-300'
                        : isDay
                          ? 'border-slate-300 bg-white'
                          : 'border-white/30 bg-transparent',
                    )}
                  >
                    {t.is_done ? (
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none">
                        <path
                          d="M20 7L10 17l-5-5"
                          stroke={isDay ? 'white' : '#0f172a'}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </span>
                  <div>
                    <div className={'text-sm font-medium ' + panelText}>{t.title}</div>
                    <div className={'text-xs ' + subtleText}>
                      {routineTitleById.get(t.routine_id) ?? 'Rutina'}
                    </div>
                  </div>
                </div>
                <div className={'text-xs ' + subtleText}>{offline ? 'Offline' : 'Tocar'}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </WidgetCardShell>
  );
}
