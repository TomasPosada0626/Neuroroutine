import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/authStore';
import {
  useDashboardPrefs,
  type DashboardWidgetId,
  type RoutineSchedule,
} from '@/features/dashboard/store/dashboardPrefsStore';
import {
  computeDayActivitySet,
  computeStreaks,
  computeWeekCounts,
  formatTimeAgo,
  formatHour,
  formatPct,
  clamp01,
  type RangeKey,
} from '@/features/dashboard/utils/dashboardUtils';
import {
  buildAchievements,
  buildRiskText,
  buildRoutineTitleById,
  buildSelectedRoutineInsight,
  buildTaskTitleById,
  computeHeatmap,
  computeLastActivity,
  computeNext7Days,
  computeRoutinesRanking,
  computeScheduledRoutinesByDow,
  computeScheduledToday,
  computeSelectedRoutineAnalytics,
  computeSelectedRoutineKpis,
  computeStruggleTasks,
  computeTodayFocus,
  deriveDisplayName,
} from '@/features/dashboard/utils/dashboardAnalytics';
import { usePopoverTooltip } from '@/features/dashboard/hooks/usePopoverTooltip';
import { useDashboardDemoSeeding } from '@/features/dashboard/hooks/useDashboardDemoSeeding';
import { WidgetOrderEditor } from '@/features/dashboard/components/WidgetOrderEditor';
import { RoutineWizardModal } from '@/features/routines/components/RoutineWizardModal';
import { RoutinePanel } from '@/features/routines/components/RoutinePanel';
import { useRoutines } from '@/features/routines/routinesStore';
import { AppShell } from '@/shared/layout';
import { cn } from '@/shared/lib/cn';
import { useUiStore } from '@/shared/state/uiStore';
import { Button, Card, Input, Modal, Tooltip } from '@/shared/ui';

type BucketGranularity = 'day' | 'week';

export function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const theme = useUiStore((s) => s.theme);
  const isDay = theme === 'day';
  const subtleText = isDay ? 'text-slate-600' : 'text-slate-300';
  const panelText = isDay ? 'text-slate-700' : 'text-slate-200';

  const prefs = useDashboardPrefs();

  const {
    loading,
    error,
    offline,
    lastSyncedAt,
    routines,
    selectedRoutineId,
    tasksByRoutineId,
    allTasks,
    taskEvents,
    hydrateFromCache,
    refreshAll,
    loadTasks,
    selectRoutine,
    setTaskDone,
  } = useRoutines();

  const [range, setRange] = useState<RangeKey>('28d');
  const [createOpen, setCreateOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [reminderSaved, setReminderSaved] = useState(false);
  const [scheduleRoutineId, setScheduleRoutineId] = useState<string | null>(null);
  const [upcomingDayKey, setUpcomingDayKey] = useState<string | null>(null);

  const didAutoPickRoutineRef = useRef(false);
  const didManualPickRoutineRef = useRef(false);

  const handleSignOut = async () => {
    navigate('/', { replace: true });
    void signOut().catch(() => {
      // ignore; landing page does not require auth
    });
  };

  useEffect(() => {
    // For a better first impression (and demo), default to a routine so analytics aren't empty.
    if (didAutoPickRoutineRef.current) return;
    if (didManualPickRoutineRef.current) return;
    if (selectedRoutineId) return;
    if (routines.length === 0) return;
    didAutoPickRoutineRef.current = true;
    selectRoutine(routines[0].id);
  }, [selectedRoutineId, routines, selectRoutine]);

  const {
    showSeedTools,
    seedBusy,
    seedError,
    onSeedDemo,
    onSeedFullDemo,
    onClearDemo,
    applyDemoScheduleDefaults,
  } = useDashboardDemoSeeding({
    user,
    refreshAll,
    routineScheduleById: prefs.routineScheduleById,
    setRoutineSchedule: prefs.setRoutineSchedule,
    locationSearch: location.search,
  });

  const routinePanelRef = useRef<HTMLDivElement | null>(null);
  const [routineGranularity, setRoutineGranularity] = useState<BucketGranularity>(() =>
    range === '90d' ? 'week' : 'day',
  );
  const effectiveRoutineGranularity: BucketGranularity =
    range === '90d' ? 'week' : routineGranularity;

  useEffect(() => {
    if (scheduleRoutineId) return;
    if (selectedRoutineId) {
      setScheduleRoutineId(selectedRoutineId);
      return;
    }
    if (routines.length > 0) setScheduleRoutineId(routines[0].id);
  }, [scheduleRoutineId, selectedRoutineId, routines]);

  useEffect(() => {
    if (!user?.id) return;
    hydrateFromCache(user.id);
    void refreshAll({
      since: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
      userId: user.id,
    });
  }, [user?.id, hydrateFromCache, refreshAll]);

  // Map the top-level scope to the analytics range for a coherent experience.
  useEffect(() => {
    if (prefs.scope === 'month' && range !== '28d') setRange('28d');
    if (prefs.scope === 'week' && range !== '7d') setRange('7d');
    if (prefs.scope === 'today' && range !== '7d') setRange('7d');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.scope]);

  useEffect(() => {
    if (selectedRoutineId) void loadTasks(selectedRoutineId);
  }, [selectedRoutineId, loadTasks]);

  const onStartSession = (routineId?: string | null) => {
    const id = routineId ?? selectedRoutineId ?? routines[0]?.id ?? null;
    if (id) selectRoutine(id);
    routinePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onCreatedRoutine = (routineId: string) => {
    selectRoutine(routineId);
    routinePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const name = useMemo(() => deriveDisplayName(user), [user]);

  const routineTitleById = useMemo(() => buildRoutineTitleById(routines), [routines]);

  const taskTitleById = useMemo(() => buildTaskTitleById(allTasks), [allTasks]);

  const tasksTotal = allTasks.length;
  const tasksDone = useMemo(() => allTasks.filter((t) => t.is_done).length, [allTasks]);
  const completionRate = tasksTotal ? (tasksDone / tasksTotal) * 100 : 0;

  const activitySet = useMemo(
    () => computeDayActivitySet(taskEvents, { routineId: selectedRoutineId }),
    [taskEvents, selectedRoutineId],
  );
  const streaks = useMemo(() => computeStreaks(activitySet), [activitySet]);
  const weekCounts = useMemo(
    () =>
      computeWeekCounts(taskEvents, {
        weekStartsOn: prefs.weekStartsOn,
        routineId: selectedRoutineId,
      }),
    [taskEvents, prefs.weekStartsOn, selectedRoutineId],
  );

  const weeklyProgressPct = prefs.weeklyGoal
    ? Math.min(100, (weekCounts.thisWeekCompleted / prefs.weeklyGoal) * 100)
    : 0;

  const achievements = buildAchievements(streaks, prefs.weeklyGoal, weekCounts.thisWeekCompleted);

  const riskText = buildRiskText(streaks);

  const next7Days = useMemo(() => computeNext7Days(), []);

  const scheduledRoutinesByDow = useMemo(
    () => computeScheduledRoutinesByDow(routines, prefs.routineScheduleById),
    [routines, prefs.routineScheduleById],
  );

  const todayDow = new Date().getDay();
  const scheduledToday = useMemo(
    () => computeScheduledToday(scheduledRoutinesByDow, routines, todayDow),
    [scheduledRoutinesByDow, todayDow, routines],
  );

  const selectedRoutine = useMemo(
    () => routines.find((r) => r.id === selectedRoutineId) ?? null,
    [routines, selectedRoutineId],
  );

  const selectedRoutineTasks = useMemo(() => {
    if (!selectedRoutineId) return allTasks;
    return tasksByRoutineId[selectedRoutineId] ?? [];
  }, [selectedRoutineId, tasksByRoutineId, allTasks]);

  const hasEvents = Array.isArray(taskEvents) && taskEvents.length > 0;

  const selectedRoutineAnalytics = useMemo(
    () => computeSelectedRoutineAnalytics({ taskEvents, selectedRoutineId, range, taskTitleById }),
    [selectedRoutineId, taskEvents, range, taskTitleById],
  );

  const routinesRanking = useMemo(
    () => computeRoutinesRanking({ taskEvents, routines, range }),
    [taskEvents, routines, range],
  );

  const selectedRoutineInsight = useMemo(
    () => buildSelectedRoutineInsight(selectedRoutine, selectedRoutineAnalytics),
    [selectedRoutine, selectedRoutineAnalytics],
  );

  const complianceTooltip = usePopoverTooltip();
  const hourlyTooltip = usePopoverTooltip();
  const {
    containerRef: heatmapContainerRef,
    tip: heatmapTip,
    show: showHeatmapTooltip,
    hide: hideHeatmapTooltip,
  } = usePopoverTooltip();

  const selectedRoutineKpis = useMemo(
    () => computeSelectedRoutineKpis({ selectedRoutineTasks, selectedRoutineId, taskEvents }),
    [selectedRoutineId, selectedRoutineTasks, taskEvents],
  );

  const todayFocus = useMemo(() => computeTodayFocus(allTasks), [allTasks]);

  const heatmap = useMemo(
    () => computeHeatmap({ allTasks, taskEvents, range, weekStartsOn: prefs.weekStartsOn }),
    [allTasks, taskEvents, range, prefs.weekStartsOn],
  );

  const lastActivity = useMemo(() => computeLastActivity(allTasks), [allTasks]);

  const rangeButtonClass = (active: boolean) =>
    cn(
      'rounded-full px-3 py-1 text-xs ring-1 transition',
      active
        ? isDay
          ? 'bg-slate-900 text-white ring-slate-900'
          : 'bg-white/15 text-white ring-white/25'
        : isDay
          ? 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
          : 'bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10',
    );

  const kpiValueClass = isDay ? 'text-slate-900' : 'text-white';
  const kpiLabelClass = isDay ? 'text-slate-600' : 'text-slate-300';

  const heatCellClass = (count: number) => {
    if (count === 0) return isDay ? 'bg-slate-200/70' : 'bg-white/7';
    const t = heatmap.max ? count / heatmap.max : 0;
    if (t < 0.34) return isDay ? 'bg-cyan-200' : 'bg-cyan-500/30';
    if (t < 0.67) return isDay ? 'bg-cyan-400' : 'bg-cyan-400/45';
    return isDay ? 'bg-cyan-600' : 'bg-cyan-300/70';
  };

  const widgetOrder = prefs.widgetOrder.filter((id) => !prefs.widgetHidden[id]);

  const struggleTasks = useMemo(
    () => computeStruggleTasks({ taskEvents, selectedRoutineId, range, taskTitleById }),
    [taskEvents, selectedRoutineId, range, taskTitleById],
  );

  const renderWidget = (id: DashboardWidgetId) => {
    if (id === 'today') {
      return widgetCardShell(
        id,
        'Hoy',
        'Tu foco inmediato: sesión + 1 tarea.',
        <div className="space-y-3">
          <div
            className={cn(
              'rounded-lg p-3 ring-1',
              isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
            )}
          >
            <div className={'text-xs ' + subtleText}>Riesgo</div>
            <div className={'mt-1 text-sm font-medium ' + panelText}>{riskText}</div>
          </div>

          <div
            className={cn(
              'rounded-lg p-3 ring-1',
              isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
            )}
          >
            <div className={'text-xs ' + subtleText}>Última actividad</div>
            <div className={'mt-1 text-sm font-medium ' + panelText}>
              {lastActivity ? lastActivity.toLocaleString() : '—'}
            </div>
          </div>

          {scheduledToday.length > 0 ? (
            <div
              className={cn(
                'rounded-lg p-3 ring-1',
                isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
              )}
            >
              <div className={'text-xs ' + subtleText}>Rutinas programadas</div>
              <div className="mt-2 space-y-2">
                {scheduledToday.map((r) => {
                  if (!r) return null;
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
            <div
              className={cn(
                'rounded-lg p-3 ring-1',
                isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
              )}
            >
              <div className={'text-xs ' + subtleText}>Rutinas programadas</div>
              <div className={'mt-1 text-sm ' + panelText}>
                Aún no has programado rutinas para hoy.
              </div>
              <div className="mt-2">
                <Button variant="secondary" onClick={() => setCustomizeOpen(true)}>
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
                  onClick={() => {
                    if (offline) return;
                    void setTaskDone({ id: t.id, routine_id: t.routine_id, is_done: !t.is_done });
                  }}
                  disabled={offline}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={t.is_done}
                      readOnly
                      className={isDay ? '' : 'accent-cyan-300'}
                    />
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
        </div>,
        { className: 'lg:col-span-2' },
      );
    }

    if (id === 'upcoming') {
      const hasSchedule = Object.keys(prefs.routineScheduleById ?? {}).length > 0;

      const routineColor = (routineId: string) => {
        // Deterministic, pleasant colors without introducing a new dependency.
        let h = 0;
        for (let i = 0; i < routineId.length; i++) h = (h * 31 + routineId.charCodeAt(i)) >>> 0;
        const hues = [190, 270, 145, 28, 335, 215];
        const hue = hues[h % hues.length];
        return isDay ? `hsl(${hue} 80% 45%)` : `hsl(${hue} 85% 65%)`;
      };

      const daySchedules = next7Days.map((d, idx) => {
        const ids = scheduledRoutinesByDow.get(d.date.getDay()) ?? [];
        const items = ids
          .map((routineId) => {
            const r = routines.find((x) => x.id === routineId);
            if (!r) return null;
            const sched = prefs.routineScheduleById[r.id];
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
              const sched = prefs.routineScheduleById[r.id];
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
      return widgetCardShell(
        id,
        'Próximo',
        'Agenda simple (7 días).',
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
                              backgroundColor: routineColor(it.routineId) as unknown as string,
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
                                backgroundColor: routineColor(it.routineId) as unknown as string,
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
                  <Button variant="secondary" onClick={applyDemoScheduleDefaults}>
                    Autoprogramar
                  </Button>
                ) : null}
                <Button variant="secondary" onClick={() => setCustomizeOpen(true)}>
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
              <Button variant="secondary" onClick={applyDemoScheduleDefaults}>
                Autoprogramar
              </Button>
            </div>
          ) : null}
        </div>,
      );
    }

    if (id === 'streaks') {
      return widgetCardShell(
        id,
        'Rachas',
        'Consistencia en días con actividad.',
        <div className="grid gap-3 sm:grid-cols-2">
          <div
            className={cn(
              'rounded-lg p-3 ring-1',
              isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
            )}
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
            className={cn(
              'rounded-lg p-3 ring-1',
              isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
            )}
          >
            <div className={'text-xs ' + subtleText}>Mejor racha</div>
            <div
              className={'mt-1 text-2xl font-semibold ' + (isDay ? 'text-slate-900' : 'text-white')}
            >
              {streaks.best}
            </div>
            <div className={'mt-1 text-xs ' + subtleText}>Tu récord histórico</div>
          </div>
        </div>,
      );
    }

    if (id === 'goal') {
      return widgetCardShell(
        id,
        'Meta semanal',
        `Objetivo: ${prefs.weeklyGoal} tareas/semana.`,
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className={'text-xs ' + subtleText}>Esta semana</div>
              <div
                className={
                  'mt-1 text-xl font-semibold ' + (isDay ? 'text-slate-900' : 'text-white')
                }
              >
                {weekCounts.thisWeekCompleted} / {prefs.weeklyGoal}
              </div>
            </div>
            <div className={'text-xs ' + subtleText}>
              vs anterior: {weekCounts.prevWeekCompleted} ({Math.round(weekCounts.deltaPct)}%)
            </div>
          </div>

          <div className={'h-2 w-full rounded-full ' + (isDay ? 'bg-slate-200' : 'bg-white/10')}>
            <div
              className={'h-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500'}
              style={{ width: `${Math.max(0, Math.min(100, weeklyProgressPct))}%` }}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div
              className={cn(
                'rounded-lg p-3 ring-1',
                isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
              )}
            >
              <div className={'text-xs ' + subtleText}>Consistencia</div>
              <div className={'mt-1 text-sm font-medium ' + panelText}>
                {Math.round(weekCounts.consistencyThis)}% de días activos
              </div>
            </div>
            <div
              className={cn(
                'rounded-lg p-3 ring-1',
                isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
              )}
            >
              <div className={'text-xs ' + subtleText}>Recomendación</div>
              <div className={'mt-1 text-sm font-medium ' + panelText}>
                {weekCounts.thisWeekCompleted === 0
                  ? 'Haz 1 tarea hoy para arrancar.'
                  : 'Mantén el ritmo con una sesión corta.'}
              </div>
            </div>
          </div>
        </div>,
      );
    }

    if (id === 'achievements') {
      return widgetCardShell(
        id,
        'Logros',
        'Pequeñas victorias que suman.',
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
        </div>,
      );
    }

    if (id === 'insights') {
      return widgetCardShell(
        id,
        'Insights accionables',
        'Qué hacer ahora + dónde mejorar.',
        <div className="space-y-3">
          <div
            className={cn(
              'rounded-lg p-3 ring-1',
              isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
            )}
          >
            <div className={'text-xs ' + subtleText}>Comparativa semanal</div>
            <div className={'mt-1 text-sm font-medium ' + panelText}>
              {weekCounts.thisWeekCompleted} completadas esta semana •{' '}
              {weekCounts.prevWeekCompleted} la anterior
            </div>
          </div>

          <div
            className={cn(
              'rounded-lg p-3 ring-1',
              isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
            )}
          >
            <div className={'text-xs ' + subtleText}>Mejor ventana horaria</div>
            <div className={'mt-1 text-sm font-medium ' + panelText}>
              {selectedRoutineAnalytics.source === 'events'
                ? `${formatHour(selectedRoutineAnalytics.bestWindowStart)}–${formatHour((selectedRoutineAnalytics.bestWindowStart + 2) % 24)}`
                : 'Activa historial real para calcularlo.'}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  if (selectedRoutineAnalytics.source !== 'events') return;
                  prefs.setReminderHour(selectedRoutineAnalytics.bestWindowStart);
                  setReminderSaved(true);
                  window.setTimeout(() => setReminderSaved(false), 1500);
                }}
                disabled={selectedRoutineAnalytics.source !== 'events'}
              >
                Programar recordatorio en mi mejor hora
              </Button>
              {reminderSaved ? (
                <div className={'text-xs ' + (isDay ? 'text-emerald-600' : 'text-emerald-300')}>
                  Guardado
                </div>
              ) : null}
            </div>
          </div>

          <div
            className={cn(
              'rounded-lg p-3 ring-1',
              isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
            )}
          >
            <div className={'text-xs ' + subtleText}>Qué te está frenando</div>
            {struggleTasks.length === 0 ? (
              <div className={'mt-1 text-sm ' + panelText}>
                Aún no hay suficientes señales. Completa/uncompleta tareas para generar insights.
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {struggleTasks.map((t) => (
                  <div key={t.taskId}>
                    <div className={'text-sm font-medium ' + panelText}>{t.title}</div>
                    <div className={'text-xs ' + subtleText}>{t.hint}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
      );
    }

    if (id === 'analytics') {
      const totalChecks = heatmap.counts.reduce((s, x) => (x.inRange ? s + x.count : s), 0);
      const activeDays = heatmap.counts.reduce((s, x) => (x.inRange && x.count > 0 ? s + 1 : s), 0);
      return widgetCardShell(
        id,
        'Analítica',
        'KPIs y tendencias.',
        loading ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div
              className={cn(
                'h-16 animate-pulse rounded-lg ring-1',
                isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
              )}
            />
            <div
              className={cn(
                'h-16 animate-pulse rounded-lg ring-1',
                isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
              )}
            />
          </div>
        ) : (
          <div className="grid gap-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div
                className={cn(
                  'rounded-lg p-3 ring-1',
                  isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
                )}
              >
                <div className={'text-xs ' + subtleText}>Checks (rango)</div>
                <div
                  className={
                    'mt-1 text-lg font-semibold ' + (isDay ? 'text-slate-900' : 'text-white')
                  }
                >
                  {totalChecks}
                </div>
              </div>
              <div
                className={cn(
                  'rounded-lg p-3 ring-1',
                  isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
                )}
              >
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
              <div
                className={cn(
                  'rounded-lg p-3 ring-1',
                  isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
                )}
              >
                <div className={'text-xs ' + subtleText}>Racha</div>
                <div
                  className={
                    'mt-1 text-lg font-semibold ' + (isDay ? 'text-slate-900' : 'text-white')
                  }
                >
                  {heatmap.streak}d
                </div>
              </div>
              <div
                className={cn(
                  'rounded-lg p-3 ring-1',
                  isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
                )}
              >
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
        ),
      );
    }

    // routines
    return widgetCardShell(
      id,
      'Rutinas',
      'Acceso rápido.',
      loading ? (
        <div className="grid gap-2">
          <div
            className={cn(
              'h-12 animate-pulse rounded-lg ring-1',
              isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
            )}
          />
          <div
            className={cn(
              'h-12 animate-pulse rounded-lg ring-1',
              isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
            )}
          />
        </div>
      ) : routines.length === 0 ? (
        <div className="flex items-center justify-between gap-3">
          <div className={'text-sm ' + panelText}>Crea tu primera rutina para empezar.</div>
          <Button variant="secondary" onClick={() => setCreateOpen(true)}>
            Crear
          </Button>
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
      ),
    );
  };

  function widgetCardShell(
    id: DashboardWidgetId,
    title: string,
    subtitle: string | null,
    body: ReactNode,
    opts?: { className?: string },
  ) {
    const collapsed = prefs.widgetCollapsed[id];
    const shellClass = 'overflow-hidden';
    const headerClass = cn(
      'flex w-full items-center justify-between gap-3 text-left',
      'rounded-lg px-0 py-0',
    );

    return (
      <Card key={id} className={cn(shellClass, opts?.className)}>
        <button
          type="button"
          className={headerClass}
          onClick={() => prefs.toggleWidgetCollapsed(id)}
        >
          <div className="p-4">
            <div className="text-sm font-semibold">{title}</div>
            {subtitle ? <div className={'text-xs ' + subtleText}>{subtitle}</div> : null}
          </div>
          <div className={'p-4 text-xs ' + subtleText}>{collapsed ? 'Mostrar' : 'Ocultar'}</div>
        </button>

        <div className={cn('px-4 pb-4', collapsed ? 'hidden' : 'block')}>{body}</div>
      </Card>
    );
  }

  return (
    <AppShell userId={user?.id} userEmail={user?.email ?? null} onSignOut={handleSignOut}>
      <RoutineWizardModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => onCreatedRoutine(id)}
      />

      <Modal
        open={customizeOpen}
        title="Personaliza tu dashboard"
        description="Configura metas, filtros y qué secciones ves primero."
        onClose={() => setCustomizeOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCustomizeOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={() => setCustomizeOpen(false)}>Aplicar</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div
            className={cn(
              'rounded-lg p-3 ring-1',
              isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
            )}
          >
            <div className="text-sm font-semibold">Preferencias</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div className={'text-xs ' + subtleText}>Meta semanal (tareas)</div>
                <Input
                  type="number"
                  min={1}
                  value={prefs.weeklyGoal}
                  onChange={(e) => prefs.setWeeklyGoal(Number(e.target.value || 1))}
                />
              </div>

              <div>
                <div className={'text-xs ' + subtleText}>Semana inicia</div>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    className={rangeButtonClass(prefs.weekStartsOn === 1)}
                    onClick={() => prefs.setWeekStartsOn(1)}
                  >
                    Lunes
                  </button>
                  <button
                    type="button"
                    className={rangeButtonClass(prefs.weekStartsOn === 0)}
                    onClick={() => prefs.setWeekStartsOn(0)}
                  >
                    Domingo
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <div className={'text-xs ' + subtleText}>Hora típica de recordatorio</div>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    placeholder="0-23"
                    value={prefs.reminderHour ?? ''}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      prefs.setReminderHour(v === '' ? null : Math.max(0, Math.min(23, Number(v))));
                    }}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      prefs.setReminderHour(null);
                      setReminderSaved(false);
                    }}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div
            className={cn(
              'rounded-lg p-3 ring-1',
              isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
            )}
          >
            <div className="text-sm font-semibold">Programación por rutina</div>
            <div className={'mt-1 text-xs ' + subtleText}>
              Define qué rutinas quieres ver en “Hoy” y “Próximo”.
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className={'text-xs ' + subtleText}>Rutina</div>
                <select
                  className={
                    'mt-1 w-full rounded-lg px-3 py-2 text-sm ring-1 ' +
                    (isDay ? 'bg-white ring-slate-200' : 'bg-slate-950/40 ring-white/10')
                  }
                  value={scheduleRoutineId ?? ''}
                  onChange={(e) => setScheduleRoutineId(e.target.value || null)}
                >
                  {routines.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>

              {scheduleRoutineId ? (
                <>
                  <div className="sm:col-span-2">
                    <div className={'text-xs ' + subtleText}>Días</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((label, dow) => {
                        const current = prefs.routineScheduleById[scheduleRoutineId] as
                          RoutineSchedule | undefined;
                        const days = current?.daysOfWeek ?? [];
                        const active = days.includes(dow);
                        return (
                          <button
                            key={dow}
                            type="button"
                            className={rangeButtonClass(active)}
                            onClick={() => {
                              const nextDays = active
                                ? days.filter((x) => x !== dow)
                                : [...days, dow].sort((a, b) => a - b);
                              prefs.setRoutineSchedule(scheduleRoutineId, {
                                daysOfWeek: nextDays,
                                hour: current?.hour ?? null,
                              });
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className={'text-xs ' + subtleText}>Hora (opcional)</div>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      placeholder="0-23"
                      value={prefs.routineScheduleById[scheduleRoutineId]?.hour ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value.trim();
                        const nextHour = raw === '' ? null : Math.max(0, Math.min(23, Number(raw)));
                        const current = prefs.routineScheduleById[scheduleRoutineId] as
                          RoutineSchedule | undefined;
                        prefs.setRoutineSchedule(scheduleRoutineId, {
                          daysOfWeek: current?.daysOfWeek ?? [],
                          hour: nextHour,
                        });
                      }}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div
            className={cn(
              'rounded-lg p-3 ring-1',
              isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
            )}
          >
            <div className="text-sm font-semibold">Secciones</div>
            <div className={'mt-1 text-xs ' + subtleText}>
              Oculta widgets o reordénalos arrastrando.
            </div>

            <div className="mt-3">
              <WidgetOrderEditor
                isDay={isDay}
                order={prefs.widgetOrder}
                hidden={prefs.widgetHidden}
                titleForId={(id) =>
                  id === 'today'
                    ? 'Hoy'
                    : id === 'upcoming'
                      ? 'Próximo'
                      : id === 'streaks'
                        ? 'Rachas'
                        : id === 'goal'
                          ? 'Meta semanal'
                          : id === 'achievements'
                            ? 'Logros'
                            : id === 'insights'
                              ? 'Insights'
                              : id === 'analytics'
                                ? 'Analítica'
                                : 'Rutinas'
                }
                onOrderChange={(next) => prefs.setWidgetOrder(next)}
                onToggleHidden={(id) => prefs.toggleWidgetHidden(id)}
              />
            </div>
          </div>
        </div>
      </Modal>

      <div className="mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-2xl font-semibold">Mi progreso</div>
              <div className={'text-sm ' + subtleText}>
                {name ? `Hola, ${name}. ` : 'Hola. '}
                Hoy cuenta: una tarea pequeña ya es progreso.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => setCustomizeOpen(true)}>
                Personalizar
              </Button>
            </div>
          </div>

          <div
            className={cn(
              'sticky top-[58px] z-10 -mx-4 border-b px-4 py-2 backdrop-blur',
              isDay ? 'border-slate-200 bg-white/70' : 'border-white/10 bg-slate-900/60',
            )}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={rangeButtonClass(prefs.scope === 'today')}
                  onClick={() => prefs.setScope('today')}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  className={rangeButtonClass(prefs.scope === 'week')}
                  onClick={() => prefs.setScope('week')}
                >
                  Semana
                </button>
                <button
                  type="button"
                  className={rangeButtonClass(prefs.scope === 'month')}
                  onClick={() => prefs.setScope('month')}
                >
                  Mes
                </button>

                <select
                  className={
                    'rounded-full px-3 py-1 text-xs ring-1 ' +
                    (isDay
                      ? 'bg-white text-slate-700 ring-slate-200'
                      : 'bg-white/90 text-slate-900 ring-white/20')
                  }
                  value={selectedRoutineId ?? ''}
                  onChange={(e) => {
                    didManualPickRoutineRef.current = true;
                    selectRoutine(e.target.value ? e.target.value : null);
                  }}
                >
                  <option value="">Todas las rutinas</option>
                  {routines.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className={'text-xs ' + subtleText}>
                  {offline
                    ? 'Modo offline (solo lectura)'
                    : formatTimeAgo(lastSyncedAt)
                      ? `Sincronizado ${formatTimeAgo(lastSyncedAt)}`
                      : '—'}
                </div>
                <Button
                  variant="secondary"
                  onClick={() =>
                    void refreshAll({
                      since: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
                      userId: user?.id ?? null,
                    })
                  }
                  disabled={loading}
                >
                  Reintentar
                </Button>
                <Button
                  className={cn(
                    'bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 hover:from-cyan-300 hover:to-violet-400 focus:ring-cyan-300',
                    !isDay ? 'ring-1 ring-white/10' : '',
                  )}
                  onClick={() => setCreateOpen(true)}
                >
                  Nueva rutina
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <Card className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-rose-600">{error}</div>
            <Button
              variant="secondary"
              onClick={() =>
                void refreshAll({
                  since: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
                  userId: user?.id ?? null,
                })
              }
              disabled={loading}
            >
              Reintentar
            </Button>
          </div>
        </Card>
      ) : null}

      {showSeedTools && user ? (
        <Card className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Demo: poblar datos</div>
              <div className={'mt-1 text-xs ' + subtleText}>
                Crea rutinas/tareas “Demo:*” + eventos para ver los módulos con datos realistas.
              </div>
              {seedError ? <div className="mt-2 text-xs text-rose-600">{seedError}</div> : null}
              <div className={'mt-2 text-[11px] ' + subtleText}>
                Disponible solo en la versión demo.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => void onClearDemo()}
                disabled={seedBusy || loading}
              >
                Limpiar demo
              </Button>
              <Button
                variant="secondary"
                onClick={() => void onSeedDemo()}
                disabled={seedBusy || loading}
              >
                Poblar rápido
              </Button>
              <Button onClick={() => void onSeedFullDemo()} disabled={seedBusy || loading}>
                Poblar completo
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="mb-8" ref={routinePanelRef}>
        <RoutinePanel />
      </div>

      {widgetOrder.length > 0 ? (
        <div className="mb-6 grid gap-4 lg:grid-cols-3">{widgetOrder.map(renderWidget)}</div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <div className={'text-xs ' + kpiLabelClass}>Rutinas activas</div>
          <div className={'mt-1 text-2xl font-semibold ' + kpiValueClass}>{routines.length}</div>
          <div className={'mt-1 text-xs ' + subtleText}>Organiza por hábito o objetivo</div>
        </Card>
        <Card>
          <div className={'text-xs ' + kpiLabelClass}>Tareas totales</div>
          <div className={'mt-1 text-2xl font-semibold ' + kpiValueClass}>{tasksTotal}</div>
          <div className={'mt-1 text-xs ' + subtleText}>En todas tus rutinas</div>
        </Card>
        <Card>
          <div className={'text-xs ' + kpiLabelClass}>Completadas</div>
          <div className={'mt-1 text-2xl font-semibold ' + kpiValueClass}>{tasksDone}</div>
          <div className={'mt-1 text-xs ' + subtleText}>Basado en tus checks</div>
        </Card>
        <Card>
          <div className={'text-xs ' + kpiLabelClass}>Tasa de cumplimiento</div>
          <div className={'mt-1 text-2xl font-semibold ' + kpiValueClass}>
            {formatPct(completionRate)}
          </div>
          <div
            className={'mt-2 h-2 w-full rounded-full ' + (isDay ? 'bg-slate-200' : 'bg-white/10')}
          >
            <div
              className={'h-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500'}
              style={{ width: `${Math.min(100, Math.max(0, completionRate))}%` }}
            />
          </div>
        </Card>
      </div>

      <div className="mb-8">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold">Analíticas por rutina</div>
            <div className={'text-xs ' + subtleText}>Selector + gráficas + insights</div>
          </div>

          <div className="flex items-center gap-2">
            <div className={'text-xs ' + subtleText}>Rutina</div>
            <select
              value={selectedRoutineId ?? ''}
              onChange={(e) => {
                didManualPickRoutineRef.current = true;
                selectRoutine(e.target.value ? e.target.value : null);
              }}
              className={cn(
                'h-9 max-w-[260px] rounded-lg px-3 text-sm ring-1 outline-none transition focus:ring-2',
                isDay
                  ? 'bg-white text-slate-900 ring-slate-200 focus:ring-slate-400'
                  : 'bg-white/90 text-slate-900 ring-white/20 focus:ring-white/40',
              )}
            >
              <option value="">Selecciona…</option>
              {routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className={cn(
            'mb-4 rounded-lg p-3 text-sm ring-1',
            isDay
              ? 'bg-slate-50 text-slate-700 ring-slate-200'
              : 'bg-white/5 text-slate-200 ring-white/10',
          )}
        >
          <div className={'text-xs ' + subtleText}>Insight automático</div>
          <div className={'mt-1 text-sm font-medium ' + panelText}>{selectedRoutineInsight}</div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <div>
              <div className="text-sm font-semibold">Rutina</div>
              <div className={'text-xs ' + subtleText}>Métricas puntuales por rutina</div>
            </div>

            <div className="mt-4">
              <div className={'text-sm font-semibold ' + panelText}>
                {selectedRoutine ? selectedRoutine.title : 'Todas las rutinas'}
              </div>
              <div className={'mt-2 grid grid-cols-3 gap-2'}>
                <div
                  className={cn(
                    'rounded-lg p-3 ring-1',
                    isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
                  )}
                >
                  <div className={'text-xs ' + subtleText}>Tareas</div>
                  <div className={'mt-1 text-lg font-semibold ' + kpiValueClass}>
                    {selectedRoutineKpis.total}
                  </div>
                </div>
                <div
                  className={cn(
                    'rounded-lg p-3 ring-1',
                    isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
                  )}
                >
                  <div className={'text-xs ' + subtleText}>Hechas</div>
                  <div className={'mt-1 text-lg font-semibold ' + kpiValueClass}>
                    {selectedRoutineKpis.done}
                  </div>
                </div>
                <div
                  className={cn(
                    'rounded-lg p-3 ring-1',
                    isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
                  )}
                >
                  <div className={'text-xs ' + subtleText}>Cumpl.</div>
                  <div className={'mt-1 text-lg font-semibold ' + kpiValueClass}>
                    {formatPct(selectedRoutineKpis.pct)}
                  </div>
                </div>
              </div>

              <div
                className={
                  'mt-3 rounded-lg p-3 ring-1 ' +
                  (isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')
                }
              >
                <div className={'text-xs ' + subtleText}>Consistencia (rango seleccionado)</div>
                <div className={'mt-1 text-sm font-medium ' + panelText}>
                  {selectedRoutineAnalytics.source === 'events' ? (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div className={'text-xs ' + subtleText}>Racha</div>
                        <div className={'text-sm font-semibold ' + panelText}>
                          {selectedRoutineAnalytics.streak}d
                        </div>
                      </div>
                      <div>
                        <div className={'text-xs ' + subtleText}>Mejor</div>
                        <div className={'text-sm font-semibold ' + panelText}>
                          {selectedRoutineAnalytics.best}d
                        </div>
                      </div>
                      <div>
                        <div className={'text-xs ' + subtleText}>Días activos</div>
                        <div className={'text-sm font-semibold ' + panelText}>
                          {formatPct(selectedRoutineAnalytics.activeDaysPct)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    'Activa el historial real para ver consistencia y gráficas.'
                  )}
                </div>
              </div>

              {selectedRoutineKpis.total === 0 ? (
                <div
                  className={
                    'mt-3 rounded-lg p-3 text-sm ring-1 ' +
                    (isDay
                      ? 'bg-slate-50 text-slate-700 ring-slate-200'
                      : 'bg-white/5 text-slate-200 ring-white/10')
                  }
                >
                  {selectedRoutine
                    ? 'Esta rutina aún no tiene tareas. Añade tareas para empezar a medir.'
                    : 'Aún no tienes tareas. Crea una rutina y añade tareas para empezar.'}
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Cumplimiento</div>
                <div className={'text-xs ' + subtleText}>
                  Completed vs uncompleted (rango seleccionado)
                </div>
              </div>
              <div className={'text-xs ' + subtleText}>
                {selectedRoutineAnalytics.source === 'events' ? 'historial real' : 'sin historial'}
              </div>
            </div>

            {selectedRoutineAnalytics.source !== 'events' ? (
              <div
                className={
                  'mt-4 rounded-lg p-3 text-sm ring-1 ' +
                  (isDay
                    ? 'bg-slate-50 text-slate-700 ring-slate-200'
                    : 'bg-white/5 text-slate-200 ring-white/10')
                }
              >
                Aún no hay historial real para graficar (ejecuta el SQL en Supabase y marca tareas
                como completadas).
              </div>
            ) : (
              <div className="mt-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {range === '90d' ? (
                      <Tooltip
                        isDay={isDay}
                        content="Para 90 días se recomienda vista semanal"
                        className="inline-flex"
                      >
                        <button
                          type="button"
                          className={cn(
                            rangeButtonClass(effectiveRoutineGranularity === 'day'),
                            'cursor-not-allowed opacity-50',
                          )}
                          disabled
                        >
                          Día
                        </button>
                      </Tooltip>
                    ) : (
                      <button
                        type="button"
                        className={rangeButtonClass(effectiveRoutineGranularity === 'day')}
                        onClick={() => setRoutineGranularity('day')}
                      >
                        Día
                      </button>
                    )}
                    <button
                      type="button"
                      className={rangeButtonClass(effectiveRoutineGranularity === 'week')}
                      onClick={() => setRoutineGranularity('week')}
                    >
                      Semana
                    </button>
                  </div>
                  <div className={'text-xs ' + subtleText}>
                    {selectedRoutineAnalytics.totalCompleted} completed •{' '}
                    {selectedRoutineAnalytics.totalUncompleted} uncompleted
                    <span className={'ml-2 ' + subtleText}>
                      ({selectedRoutineAnalytics.trendPct >= 0 ? '+' : ''}
                      {Math.round(selectedRoutineAnalytics.trendPct)}%)
                    </span>
                  </div>
                </div>

                {(() => {
                  const series =
                    effectiveRoutineGranularity === 'week'
                      ? selectedRoutineAnalytics.weekSeries
                      : selectedRoutineAnalytics.daySeries;
                  const maxTotal = series.reduce(
                    (m, x) => Math.max(m, x.completed + x.uncompleted),
                    0,
                  );
                  const limited =
                    effectiveRoutineGranularity === 'day'
                      ? series.slice(-Math.min(series.length, 28))
                      : series;
                  const n = Math.max(1, limited.length);
                  const W = 320;
                  const H = 96;
                  const padX = 10;
                  const padY = 10;
                  const innerW = W - padX * 2;
                  const innerH = H - padY * 2;
                  const gap = n > 20 ? 1 : 2;
                  const barW = Math.max(2, Math.floor((innerW - gap * (n - 1)) / n));

                  const cFill = isDay ? 'rgb(34 211 238)' : 'rgba(34, 211, 238, 0.75)';
                  const uFill = isDay ? 'rgb(251 113 133)' : 'rgba(251, 113, 133, 0.65)';

                  return (
                    <>
                      <div ref={complianceTooltip.containerRef} className="relative">
                        <svg
                          viewBox={`0 0 ${W} ${H}`}
                          className="h-24 w-full"
                          role="img"
                          aria-label="Cumplimiento"
                          onMouseLeave={complianceTooltip.hide}
                        >
                          <rect
                            x="0"
                            y="0"
                            width={W}
                            height={H}
                            rx="12"
                            className={isDay ? 'fill-slate-50' : 'fill-white/5'}
                          />
                          {limited.map((d, i) => {
                            const total = d.completed + d.uncompleted;
                            const t = maxTotal ? total / maxTotal : 0;
                            const totalH = Math.round(innerH * clamp01(t));
                            const completedH = total
                              ? Math.round((d.completed / total) * totalH)
                              : 0;
                            const uncompletedH = totalH - completedH;

                            const x = padX + i * (barW + gap);
                            const yTop = padY + (innerH - totalH);
                            const yCompleted = yTop + uncompletedH;
                            return (
                              <g
                                key={d.key}
                                onMouseMove={(e) =>
                                  complianceTooltip.show(e, {
                                    title: d.key,
                                    lines: [
                                      `Hechas: ${d.completed}`,
                                      `No hechas: ${d.uncompleted}`,
                                    ],
                                  })
                                }
                                onPointerDown={(e) => {
                                  if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                                    complianceTooltip.show(e, {
                                      title: d.key,
                                      lines: [
                                        `Hechas: ${d.completed}`,
                                        `No hechas: ${d.uncompleted}`,
                                      ],
                                    });
                                  }
                                }}
                              >
                                {uncompletedH > 0 ? (
                                  <rect
                                    x={x}
                                    y={yTop}
                                    width={barW}
                                    height={uncompletedH}
                                    rx={3}
                                    fill={uFill}
                                    opacity={0.85}
                                  />
                                ) : null}
                                {completedH > 0 ? (
                                  <rect
                                    x={x}
                                    y={yCompleted}
                                    width={barW}
                                    height={completedH}
                                    rx={3}
                                    fill={cFill}
                                    opacity={0.95}
                                  />
                                ) : null}
                              </g>
                            );
                          })}
                        </svg>

                        {complianceTooltip.tip ? (
                          <div
                            className={cn(
                              'pointer-events-none absolute z-20 min-w-40 max-w-64 rounded-lg px-3 py-2 text-xs shadow-lg ring-1',
                              isDay
                                ? 'bg-white text-slate-900 ring-slate-200'
                                : 'bg-slate-900 text-slate-100 ring-white/10',
                            )}
                            style={{
                              left: complianceTooltip.tip.x,
                              top: complianceTooltip.tip.y,
                              transform: 'translate(-50%, calc(-100% - 10px))',
                            }}
                          >
                            <div className="font-semibold">{complianceTooltip.tip.title}</div>
                            {complianceTooltip.tip.lines.map((l) => (
                              <div
                                key={l}
                                className={cn(
                                  'mt-0.5',
                                  isDay ? 'text-slate-600' : 'text-slate-300',
                                )}
                              >
                                {l}
                              </div>
                            ))}
                            <div
                              className={cn(
                                'absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 ring-1',
                                isDay ? 'bg-white ring-slate-200' : 'bg-slate-900 ring-white/10',
                              )}
                            />
                          </div>
                        ) : null}
                      </div>

                      <div
                        className={'mt-2 flex items-center justify-between text-xs ' + subtleText}
                      >
                        <div>{limited[0]?.key}</div>
                        <div>
                          {effectiveRoutineGranularity === 'day'
                            ? 'Últimos 28 días máx.'
                            : 'Semanas del rango'}
                        </div>
                        <div>Hoy</div>
                      </div>

                      <div className={'mt-2 flex items-center gap-3 text-xs ' + subtleText}>
                        <div className="flex items-center gap-1">
                          <span
                            className="inline-block h-2 w-2 rounded-sm"
                            style={{ backgroundColor: cFill as unknown as string }}
                          />
                          <span>Completed</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span
                            className="inline-block h-2 w-2 rounded-sm"
                            style={{ backgroundColor: uFill as unknown as string }}
                          />
                          <span>Uncompleted</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Hora típica</div>
              <div className={'text-xs ' + subtleText}>Histograma por hora (completed)</div>
            </div>
            <div className={'text-xs ' + subtleText}>
              {selectedRoutine && selectedRoutineAnalytics.source === 'events'
                ? `Mejor franja: ${formatHour(selectedRoutineAnalytics.bestWindowStart)}–${formatHour((selectedRoutineAnalytics.bestWindowStart + 3) % 24)}`
                : '—'}
            </div>
          </div>

          {!selectedRoutine ? (
            <div
              className={
                'mt-4 rounded-lg p-3 text-sm ring-1 ' +
                (isDay
                  ? 'bg-slate-50 text-slate-700 ring-slate-200'
                  : 'bg-white/5 text-slate-200 ring-white/10')
              }
            >
              Selecciona una rutina para ver su histograma.
            </div>
          ) : selectedRoutineAnalytics.source !== 'events' ? (
            <div
              className={
                'mt-4 rounded-lg p-3 text-sm ring-1 ' +
                (isDay
                  ? 'bg-slate-50 text-slate-700 ring-slate-200'
                  : 'bg-white/5 text-slate-200 ring-white/10')
              }
            >
              Sin historial real aún. Se habilita al ejecutar el SQL y marcar tareas.
            </div>
          ) : (
            <div className="mt-4">
              {(() => {
                const W = 420;
                const H = 100;
                const padX = 10;
                const padY = 10;
                const innerW = W - padX * 2;
                const innerH = H - padY * 2;
                const n = 24;
                const gap = 2;
                const barW = Math.floor((innerW - gap * (n - 1)) / n);
                const max = Math.max(1, ...selectedRoutineAnalytics.hourCompleted);
                const fill = isDay ? 'rgb(34 211 238)' : 'rgba(34, 211, 238, 0.75)';
                const windowStart = selectedRoutineAnalytics.bestWindowStart;

                return (
                  <>
                    <div ref={hourlyTooltip.containerRef} className="relative">
                      <svg
                        viewBox={`0 0 ${W} ${H}`}
                        className="h-24 w-full"
                        role="img"
                        aria-label="Histograma por hora"
                        onMouseLeave={hourlyTooltip.hide}
                      >
                        <rect
                          x="0"
                          y="0"
                          width={W}
                          height={H}
                          rx="12"
                          className={isDay ? 'fill-slate-50' : 'fill-white/5'}
                        />
                        {selectedRoutineAnalytics.hourCompleted.map((v, i) => {
                          const h = Math.round(innerH * clamp01(v / max));
                          const x = padX + i * (barW + gap);
                          const y = padY + (innerH - h);
                          const isHot =
                            i === windowStart ||
                            i === (windowStart + 1) % 24 ||
                            i === (windowStart + 2) % 24;
                          return (
                            <g
                              key={i}
                              onMouseMove={(e) =>
                                hourlyTooltip.show(e, {
                                  title: formatHour(i),
                                  lines: [`Hechas: ${v}`, isHot ? 'En tu mejor franja' : ''],
                                })
                              }
                              onPointerDown={(e) => {
                                if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                                  hourlyTooltip.show(e, {
                                    title: formatHour(i),
                                    lines: [`Hechas: ${v}`, isHot ? 'En tu mejor franja' : ''],
                                  });
                                }
                              }}
                            >
                              <rect
                                x={x}
                                y={y}
                                width={barW}
                                height={h}
                                rx={3}
                                fill={fill}
                                opacity={isHot ? 1 : 0.55}
                              />
                            </g>
                          );
                        })}
                      </svg>

                      {hourlyTooltip.tip ? (
                        <div
                          className={cn(
                            'pointer-events-none absolute z-20 min-w-36 max-w-64 rounded-lg px-3 py-2 text-xs shadow-lg ring-1',
                            isDay
                              ? 'bg-white text-slate-900 ring-slate-200'
                              : 'bg-slate-900 text-slate-100 ring-white/10',
                          )}
                          style={{
                            left: hourlyTooltip.tip.x,
                            top: hourlyTooltip.tip.y,
                            transform: 'translate(-50%, calc(-100% - 10px))',
                          }}
                        >
                          <div className="font-semibold">{hourlyTooltip.tip.title}</div>
                          {hourlyTooltip.tip.lines.filter(Boolean).map((l) => (
                            <div
                              key={l}
                              className={cn('mt-0.5', isDay ? 'text-slate-600' : 'text-slate-300')}
                            >
                              {l}
                            </div>
                          ))}
                          <div
                            className={cn(
                              'absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 ring-1',
                              isDay ? 'bg-white ring-slate-200' : 'bg-slate-900 ring-white/10',
                            )}
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className={'mt-2 flex items-center justify-between text-xs ' + subtleText}>
                      <div>00</div>
                      <div>12</div>
                      <div>23</div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-1">
          <div>
            <div className="text-sm font-semibold">Regularidad</div>
            <div className={'text-xs ' + subtleText}>Tiempo entre completados</div>
          </div>

          {selectedRoutineAnalytics.source !== 'events' ? (
            <div
              className={
                'mt-4 rounded-lg p-3 text-sm ring-1 ' +
                (isDay
                  ? 'bg-slate-50 text-slate-700 ring-slate-200'
                  : 'bg-white/5 text-slate-200 ring-white/10')
              }
            >
              Sin historial real aún.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div
                className={cn(
                  'rounded-lg p-3 ring-1',
                  isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
                )}
              >
                <div className={'text-xs ' + subtleText}>Mediana</div>
                <div className={'mt-1 text-sm font-semibold ' + panelText}>
                  {selectedRoutineAnalytics.medianHours == null
                    ? '—'
                    : `${Math.round(selectedRoutineAnalytics.medianHours)}h`}
                </div>
              </div>
              <div
                className={cn(
                  'rounded-lg p-3 ring-1',
                  isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
                )}
              >
                <div className={'text-xs ' + subtleText}>P90</div>
                <div className={'mt-1 text-sm font-semibold ' + panelText}>
                  {selectedRoutineAnalytics.p90Hours == null
                    ? '—'
                    : `${Math.round(selectedRoutineAnalytics.p90Hours)}h`}
                </div>
              </div>

              {(() => {
                const b = selectedRoutineAnalytics.intervalBuckets;
                const items: Array<{ label: string; value: number }> = [
                  { label: '<6h', value: b.lt6h },
                  { label: '6–24h', value: b.h6_24 },
                  { label: '1–3d', value: b.d1_3 },
                  { label: '3–7d', value: b.d3_7 },
                  { label: '>7d', value: b.gt7d },
                ];
                const total = items.reduce((s, x) => s + x.value, 0);
                const max = Math.max(1, ...items.map((x) => x.value));
                const fill = isDay ? 'rgb(34 211 238)' : 'rgba(34, 211, 238, 0.75)';
                return (
                  <div
                    className={cn(
                      'rounded-lg p-3 ring-1',
                      isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
                    )}
                  >
                    <div className={'text-xs ' + subtleText}>Distribución</div>
                    <div className="mt-2 space-y-2">
                      {items.map((it) => (
                        <Tooltip
                          key={it.label}
                          isDay={isDay}
                          content={`${it.label}: ${it.value} intervalos`}
                          className="block"
                        >
                          <div className="flex items-center gap-2">
                            <div className={'w-10 text-xs ' + subtleText}>{it.label}</div>
                            <div
                              className={
                                'h-2 flex-1 rounded-full ' +
                                (isDay ? 'bg-slate-200' : 'bg-white/10')
                              }
                            >
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${Math.round((it.value / max) * 100)}%`,
                                  backgroundColor: fill as unknown as string,
                                  opacity: 0.9,
                                }}
                              />
                            </div>
                            <div className={'w-10 text-right text-xs ' + subtleText}>
                              {total ? Math.round((it.value / total) * 100) : 0}%
                            </div>
                          </div>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </Card>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div>
            <div className="text-sm font-semibold">Top tareas</div>
            <div className={'text-xs ' + subtleText}>Más completadas, re-open y desmarcadas</div>
          </div>

          {selectedRoutineAnalytics.source !== 'events' ? (
            <div
              className={
                'mt-4 rounded-lg p-3 text-sm ring-1 ' +
                (isDay
                  ? 'bg-slate-50 text-slate-700 ring-slate-200'
                  : 'bg-white/5 text-slate-200 ring-white/10')
              }
            >
              Sin historial real aún.
            </div>
          ) : selectedRoutineAnalytics.topTasks.length === 0 ? (
            <div
              className={
                'mt-4 rounded-lg p-3 text-sm ring-1 ' +
                (isDay
                  ? 'bg-slate-50 text-slate-700 ring-slate-200'
                  : 'bg-white/5 text-slate-200 ring-white/10')
              }
            >
              Aún no hay eventos en este rango.
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-inset ring-slate-200/70 dark:ring-white/10">
              <div
                className={cn(
                  'grid grid-cols-12 gap-2 px-3 py-2 text-xs',
                  isDay ? 'bg-slate-50 text-slate-600' : 'bg-white/5 text-slate-300',
                )}
              >
                <div className="col-span-6">Tarea</div>
                <div className="col-span-2 text-right">Completed</div>
                <div className="col-span-2 text-right">Uncompleted</div>
                <div className="col-span-2 text-right">Re-open</div>
              </div>
              <div className={cn('divide-y', isDay ? 'divide-slate-200' : 'divide-white/10')}>
                {selectedRoutineAnalytics.topTasks.map((t) => (
                  <div
                    key={t.taskId}
                    className={cn(
                      'grid grid-cols-12 gap-2 px-3 py-2 text-sm',
                      isDay ? 'bg-white' : 'bg-transparent',
                    )}
                  >
                    <Tooltip isDay={isDay} content={t.title} className="col-span-6">
                      <div className={'truncate ' + panelText}>{t.title}</div>
                    </Tooltip>
                    <div className={'col-span-2 text-right ' + panelText}>{t.completed}</div>
                    <div className={'col-span-2 text-right ' + panelText}>{t.uncompleted}</div>
                    <div className={'col-span-2 text-right ' + panelText}>{t.reopens}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-1">
          <div>
            <div className="text-sm font-semibold">Comparativa</div>
            <div className={'text-xs ' + subtleText}>Ranking de rutinas (rango)</div>
          </div>

          {!hasEvents ? (
            <div
              className={
                'mt-4 rounded-lg p-3 text-sm ring-1 ' +
                (isDay
                  ? 'bg-slate-50 text-slate-700 ring-slate-200'
                  : 'bg-white/5 text-slate-200 ring-white/10')
              }
            >
              Activa historial real para ranking.
            </div>
          ) : routinesRanking.length === 0 ? (
            <div
              className={
                'mt-4 rounded-lg p-3 text-sm ring-1 ' +
                (isDay
                  ? 'bg-slate-50 text-slate-700 ring-slate-200'
                  : 'bg-white/5 text-slate-200 ring-white/10')
              }
            >
              Aún no hay suficientes datos.
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {routinesRanking.map((r, idx) => (
                <Tooltip
                  key={r.id}
                  isDay={isDay}
                  className="block"
                  content={`Activos ${Math.round(r.activePct)}% • Completed ${r.completed} • Tendencia ${r.trendPct >= 0 ? '+' : ''}${Math.round(r.trendPct)}%`}
                >
                  <div
                    className={cn(
                      'rounded-lg p-3 ring-1',
                      isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className={'text-sm font-medium ' + panelText}>
                        {idx + 1}. {r.title}
                      </div>
                      <div className={'text-xs ' + subtleText}>
                        {r.trendPct >= 0 ? '+' : ''}
                        {Math.round(r.trendPct)}%
                      </div>
                    </div>
                    <div className={'mt-1 flex items-center justify-between text-xs ' + subtleText}>
                      <div>Activos: {Math.round(r.activePct)}%</div>
                      <div>Completed: {r.completed}</div>
                    </div>
                  </div>
                </Tooltip>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mb-8">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Actividad</div>
              <div className={'text-xs ' + subtleText}>
                Checks por día ({heatmap.source === 'events' ? 'historial real' : 'estimado'})
              </div>
            </div>
            <div className={'text-xs ' + subtleText}>Rango: {range}</div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <div
              ref={heatmapContainerRef}
              className="relative inline-block"
              onMouseLeave={hideHeatmapTooltip}
            >
              <div className="inline-grid grid-flow-col grid-rows-7 gap-1">
                {heatmap.counts.map((c) => (
                  <div
                    key={c.key}
                    onMouseMove={(e) => {
                      if (!c.inRange) return;
                      showHeatmapTooltip(e, { title: c.key, lines: [`Checks: ${c.count}`] });
                    }}
                    onPointerDown={(e) => {
                      if (!c.inRange) return;
                      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                        showHeatmapTooltip(e, { title: c.key, lines: [`Checks: ${c.count}`] });
                      }
                    }}
                    className={
                      'h-3 w-3 rounded-sm ring-1 transition-colors duration-500 ' +
                      heatCellClass(c.count) +
                      ' ' +
                      (isDay ? 'ring-slate-200' : 'ring-white/10') +
                      (c.inRange ? '' : ' opacity-25')
                    }
                  />
                ))}
              </div>

              {heatmapTip ? (
                <div
                  className={cn(
                    'pointer-events-none absolute z-20 min-w-36 max-w-64 rounded-lg px-3 py-2 text-xs shadow-lg ring-1',
                    isDay
                      ? 'bg-white text-slate-900 ring-slate-200'
                      : 'bg-slate-900 text-slate-100 ring-white/10',
                  )}
                  style={{
                    left: heatmapTip.x,
                    top: heatmapTip.y,
                    transform: 'translate(-50%, calc(-100% - 10px))',
                  }}
                >
                  <div className="font-semibold">{heatmapTip.title}</div>
                  {heatmapTip.lines.map((l) => (
                    <div
                      key={l}
                      className={cn('mt-0.5', isDay ? 'text-slate-600' : 'text-slate-300')}
                    >
                      {l}
                    </div>
                  ))}
                  <div
                    className={cn(
                      'absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 ring-1',
                      isDay ? 'bg-white ring-slate-200' : 'bg-slate-900 ring-white/10',
                    )}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className={'mt-3 flex items-center justify-between text-xs ' + subtleText}>
            <div>Menos</div>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={
                    'h-3 w-3 rounded-sm ring-1 ' +
                    (i === 0
                      ? heatCellClass(0)
                      : heatCellClass(Math.max(1, Math.round((heatmap.max * i) / 3)))) +
                    ' ' +
                    (isDay ? 'ring-slate-200' : 'ring-white/10')
                  }
                />
              ))}
            </div>
            <div>Más</div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
