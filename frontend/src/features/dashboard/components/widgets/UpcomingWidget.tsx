import { useState } from 'react';
import { WidgetCardShell } from '@/features/dashboard/components/WidgetCardShell';
import { computeNext7Days } from '@/features/dashboard/utils/dashboardAnalytics';
import { formatHour } from '@/features/dashboard/utils/dashboardUtils';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui';
import type { DashboardWidgetId, RoutineSchedule } from '@/shared/state/dashboardPrefsStore';
import type { Routine } from '@/shared/types/routines';

type Props = {
  routines: Routine[];
  routineScheduleById: Record<string, RoutineSchedule>;
  next7Days: ReturnType<typeof computeNext7Days>;
  scheduledRoutinesByDow: Map<number, string[]>;
  onStartSession: (routineId: string | null) => void;
  onCustomize: () => void;
  onApplyDemoScheduleDefaults: () => void;
  isDay: boolean;
  subtleText: string;
  panelText: string;
  collapsed: boolean;
  onToggleCollapsed: (id: DashboardWidgetId) => void;
};

// Deterministic, pleasant colors without introducing a new dependency.
function routineColor(routineId: string, isDay: boolean): string {
  let h = 0;
  for (let i = 0; i < routineId.length; i++) h = (h * 31 + routineId.charCodeAt(i)) >>> 0;
  const hues = [190, 270, 145, 28, 335, 215];
  const hue = hues[h % hues.length];
  return isDay ? `hsl(${hue} 80% 45%)` : `hsl(${hue} 85% 65%)`;
}

export function UpcomingWidget({
  routines,
  routineScheduleById,
  next7Days,
  scheduledRoutinesByDow,
  onStartSession,
  onCustomize,
  onApplyDemoScheduleDefaults,
  isDay,
  subtleText,
  panelText,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const [upcomingDayKey, setUpcomingDayKey] = useState<string | null>(null);
  const hasSchedule = Object.keys(routineScheduleById ?? {}).length > 0;

  const daySchedules = next7Days.map((d, idx) => {
    const ids = scheduledRoutinesByDow.get(d.date.getDay()) ?? [];
    const items = ids
      .map((routineId) => {
        const r = routines.find((x) => x.id === routineId);
        if (!r) return null;
        const sched = routineScheduleById[r.id];
        const hour = sched?.hour ?? null;
        return { routineId: r.id, title: r.title, hour, dayIndex: idx };
      })
      .filter(Boolean) as Array<{
      routineId: string;
      title: string;
      hour: number | null;
      dayIndex: number;
    }>;

    items.sort((a, b) => {
      const ah = a.hour ?? 99;
      const bh = b.hour ?? 99;
      if (ah !== bh) return ah - bh;
      return a.title.localeCompare(b.title);
    });

    return { ...d, items };
  });

  const selectedDay = upcomingDayKey
    ? (daySchedules.find((d) => d.key === upcomingDayKey) ?? null)
    : null;
  const selectedDayItems = selectedDay?.items ?? [];

  const upcomingItems = next7Days
    .flatMap((d, idx) => {
      const ids = scheduledRoutinesByDow.get(d.date.getDay()) ?? [];
      return ids
        .map((id) => {
          const r = routines.find((x) => x.id === id);
          if (!r) return null;
          const sched = routineScheduleById[r.id];
          const hour = sched?.hour ?? null;
          return {
            key: `${d.key}:${r.id}`,
            routineId: r.id,
            dayKey: d.key,
            dayLabel: d.label,
            dayIndex: idx,
            hour,
            title: r.title,
          };
        })
        .filter(Boolean) as Array<{
        key: string;
        routineId: string;
        dayKey: string;
        dayLabel: string;
        dayIndex: number;
        hour: number | null;
        title: string;
      }>;
    })
    .sort((a, b) => {
      if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
      const ah = a.hour ?? 99;
      const bh = b.hour ?? 99;
      if (ah !== bh) return ah - bh;
      return a.title.localeCompare(b.title);
    });

  const totalNext7 = upcomingItems.length;

  return (
    <WidgetCardShell
      id="upcoming"
      title="Próximo"
      subtitle="Agenda simple (7 días)."
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      subtleText={subtleText}
    >
      <div className="grid gap-3">
        <div
          className={cn(
            'rounded-lg p-3 ring-1',
            isDay ? 'bg-white ring-slate-200' : 'bg-white/5 ring-white/10',
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={'text-xs ' + subtleText}>Mini calendario semanal</div>
              <div className={'mt-0.5 text-[11px] ' + subtleText}>
                3 slots por día • se llena con rutinas programadas
              </div>
            </div>
            <div className={'text-xs ' + subtleText}>{totalNext7} en 7 días</div>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-2">
            {daySchedules.map((d) => {
              const dateNum = d.date.getDate();
              const items = d.items;
              const maxSlots = 3;
              const shown = items.slice(0, maxSlots);
              const extra = Math.max(0, items.length - maxSlots);
              const isSelected = upcomingDayKey === d.key;

              return (
                <button
                  key={d.key}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setUpcomingDayKey((prev) => (prev === d.key ? null : d.key))}
                  className={cn(
                    'rounded-lg p-2 text-left ring-1 transition focus:outline-none focus:ring-2',
                    isDay
                      ? 'bg-slate-50 ring-slate-200 focus:ring-cyan-500/40'
                      : 'bg-white/3 ring-white/10 focus:ring-cyan-300/30',
                    isSelected ? (isDay ? 'ring-cyan-500/60' : 'ring-cyan-300/40') : '',
                    isSelected ? (isDay ? 'bg-cyan-50/60' : 'bg-cyan-400/10') : '',
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className={'text-[10px] ' + subtleText}>{d.label}</div>
                    <div
                      className={cn(
                        'text-[10px] font-semibold',
                        isDay ? 'text-slate-700' : 'text-slate-200',
                      )}
                    >
                      {dateNum}
                    </div>
                  </div>

                  <div className="mt-2 grid gap-1">
                    {Array.from({ length: maxSlots }).map((_, i) => {
                      const it = shown[i];
                      if (!it) {
                        return (
                          <div
                            key={i}
                            className={cn(
                              'h-2.5 rounded-sm ring-1',
                              isDay ? 'bg-white ring-slate-200' : 'bg-white/5 ring-white/10',
                            )}
                          />
                        );
                      }

                      const tip = `${it.title}${it.hour == null ? '' : ` • ${formatHour(it.hour)}`}`;
                      return (
                        <div
                          key={i}
                          title={tip}
                          className={cn(
                            'h-2.5 rounded-sm ring-1',
                            isDay ? 'ring-slate-200' : 'ring-white/10',
                          )}
                          style={{
                            backgroundColor: routineColor(it.routineId, isDay),
                            opacity: isDay ? 0.95 : 0.8,
                          }}
                        />
                      );
                    })}
                  </div>

                  <div className="mt-1 flex items-center justify-between">
                    <div className={'text-[10px] ' + subtleText}>{items.length} rut.</div>
                    {extra > 0 ? (
                      <div className={'text-[10px] ' + subtleText}>+{extra}</div>
                    ) : (
                      <div className="h-3" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {totalNext7 > 0 ? (
            <div
              className={cn(
                'mt-3 rounded-lg p-3 ring-1',
                isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={'text-xs ' + subtleText}>Detalle por día</div>
                  <div className={'mt-0.5 text-[11px] ' + subtleText}>
                    {selectedDay
                      ? `Seleccionado: ${selectedDay.label}`
                      : 'Toca un día del calendario para ver sus rutinas.'}
                  </div>
                </div>
                {selectedDay ? (
                  <Button variant="secondary" onClick={() => setUpcomingDayKey(null)}>
                    Cerrar
                  </Button>
                ) : null}
              </div>

              {selectedDay ? (
                selectedDayItems.length === 0 ? (
                  <div className={'mt-2 text-sm ' + panelText}>
                    No hay rutinas programadas para este día.
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {selectedDayItems.map((it) => (
                      <div
                        key={`${selectedDay.key}:${it.routineId}`}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{
                              backgroundColor: routineColor(it.routineId, isDay),
                              opacity: 0.9,
                            }}
                          />
                          <div className="min-w-0">
                            <div
                              className={cn(
                                'truncate text-sm font-medium',
                                isDay ? 'text-slate-900' : 'text-white',
                              )}
                            >
                              {it.title}
                            </div>
                            <div className={'text-[11px] ' + subtleText}>
                              {it.hour == null ? 'Sin hora' : formatHour(it.hour)}
                            </div>
                          </div>
                        </div>
                        <Button variant="secondary" onClick={() => onStartSession(it.routineId)}>
                          Empezar
                        </Button>
                      </div>
                    ))}
                  </div>
                )
              ) : null}
            </div>
          ) : null}
        </div>
        <div className={'text-xs ' + subtleText}>
          Tip: programa rutinas por días en “Personalizar”.
        </div>

        {totalNext7 === 0 ? (
          <div
            className={cn(
              'rounded-lg p-3 text-sm ring-1',
              isDay
                ? 'bg-slate-50 text-slate-700 ring-slate-200'
                : 'bg-white/5 text-slate-200 ring-white/10',
            )}
          >
            <div className={'text-xs ' + subtleText}>Sin agenda por ahora</div>
            <div className={'mt-1 text-sm font-medium ' + panelText}>
              No hay rutinas programadas para los próximos 7 días.
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {!hasSchedule && routines.length > 0 ? (
                <Button variant="secondary" onClick={onApplyDemoScheduleDefaults}>
                  Autoprogramar
                </Button>
              ) : null}
              <Button variant="secondary" onClick={onCustomize}>
                Personalizar
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'rounded-lg p-3 ring-1',
              isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className={'text-xs ' + subtleText}>Próximas rutinas</div>
              <div className={'text-xs ' + subtleText}>{totalNext7} en 7 días</div>
            </div>
            <div className="mt-2 space-y-2">
              {upcomingItems.slice(0, 6).map((it) => (
                <div key={it.key} className="flex items-center justify-between gap-3">
                  <div>
                    <div className={'text-sm font-medium ' + panelText}>{it.title}</div>
                    <div className={'text-[11px] ' + subtleText}>{it.dayLabel}</div>
                  </div>
                  <div className={'text-xs ' + subtleText}>
                    {it.hour == null ? '—' : formatHour(it.hour)}
                  </div>
                </div>
              ))}
              {upcomingItems.length > 6 ? (
                <div className={'text-[11px] ' + subtleText}>+{upcomingItems.length - 6} más</div>
              ) : null}
            </div>
          </div>
        )}

        {!hasSchedule && routines.length > 0 ? (
          <div className="pt-1">
            <Button variant="secondary" onClick={onApplyDemoScheduleDefaults}>
              Autoprogramar
            </Button>
          </div>
        ) : null}
      </div>
    </WidgetCardShell>
  );
}
