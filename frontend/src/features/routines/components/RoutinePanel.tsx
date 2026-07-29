import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/authStore';
import { useRoutines } from '@/features/routines/routinesStore';
import { RoutineFormModal, TaskFormModal } from '@/features/routines/components';
import { useDashboardPrefs, type RoutineSchedule } from '@/shared/state/dashboardPrefsStore';
import { listRoutines, searchRoutines } from '@/features/routines/routinesService';
import { cn } from '@/shared/lib/cn';
import { Button, Card, Input, Textarea } from '@/shared/ui';
import { useUiStore } from '@/shared/state/uiStore';

function localDateKey(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

// A recurring task with no specific days repeats daily (the original ADR-008 behavior); one with
// specific days shows an abbreviated weekday list instead, e.g. "L X V".
function recurrenceBadgeText(days: number[] | null | undefined): string {
  if (!days || days.length === 0) return 'Diario';
  const labels = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => labels[d] ?? String(d))
    .join(' ');
}

export function RoutinePanel() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const theme = useUiStore((s) => s.theme);
  const isDay = theme === 'day';

  const prefs = useDashboardPrefs();
  const queryClient = useQueryClient();

  const subtleText = isDay ? 'text-slate-500' : 'text-slate-300';
  const secondaryText = isDay ? 'text-slate-600' : 'text-slate-200';

  const emptyStateClass = isDay
    ? 'rounded-lg bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200'
    : 'rounded-lg bg-white/5 p-3 text-sm text-slate-200 ring-1 ring-white/10';

  const routineItemClass = (selected: boolean) => {
    const base = 'w-full rounded-lg px-3 py-2 text-left text-sm ring-1 transition ';
    if (isDay) {
      return (
        base +
        (selected
          ? 'bg-slate-900 text-white ring-slate-900'
          : 'bg-white ring-slate-200 hover:bg-slate-50')
      );
    }

    return (
      base +
      (selected
        ? 'bg-white/12 text-white ring-white/20'
        : 'bg-white/5 text-slate-50 ring-white/10 hover:bg-white/7')
    );
  };
  const {
    loading: actionLoading,
    error,
    offline,
    offlineSyncIssues,
    selectedRoutineId,
    tasksByRoutineId,
    selectRoutine,
    editRoutine,
    removeRoutine,
    loadTasks,
    addTask,
    setTaskDone,
    editTask,
    postponeTask,
    removeTask,
    discardOfflineTask,
  } = useRoutines();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskRecurring, setNewTaskRecurring] = useState(false);
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [routineQuery, setRoutineQuery] = useState('');
  const [debouncedRoutineQuery, setDebouncedRoutineQuery] = useState('');

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nr-routine-panel-collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('nr-fav-routines');
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      return new Set(ids);
    } catch {
      return new Set();
    }
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  const routinesQuery = useQuery({
    queryKey: ['routines', userId],
    queryFn: () => listRoutines(),
    enabled: Boolean(userId),
  });

  const routinesSearchQuery = useQuery({
    queryKey: ['routines', 'search', userId, debouncedRoutineQuery],
    queryFn: () => searchRoutines(debouncedRoutineQuery),
    enabled: Boolean(userId) && debouncedRoutineQuery.trim().length > 0,
    staleTime: 60 * 1000,
  });

  const routines = useMemo(() => {
    const hasSearch = debouncedRoutineQuery.trim().length > 0;
    if (hasSearch) return routinesSearchQuery.data ?? [];
    return routinesQuery.data ?? [];
  }, [debouncedRoutineQuery, routinesSearchQuery.data, routinesQuery.data]);

  const routinesLoading =
    !userId ||
    actionLoading ||
    routinesQuery.isLoading ||
    routinesQuery.isFetching ||
    routinesSearchQuery.isFetching;
  const routinesError =
    error ??
    (routinesQuery.error instanceof Error
      ? routinesQuery.error.message
      : routinesSearchQuery.error instanceof Error
        ? routinesSearchQuery.error.message
        : null);

  const persistPanelCollapsed = (next: boolean) => {
    setPanelCollapsed(next);
    try {
      localStorage.setItem('nr-routine-panel-collapsed', next ? '1' : '0');
    } catch {
      // ignore
    }
  };

  const dayPillClass = (active: boolean) => {
    const base = 'rounded-lg px-2 py-1 text-xs font-medium ring-1 transition';
    if (isDay)
      return (
        base +
        (active
          ? ' bg-slate-900 text-white ring-slate-900'
          : ' bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')
      );
    return (
      base +
      (active
        ? ' bg-white/15 text-white ring-white/25'
        : ' bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10')
    );
  };

  const scheduleSummary = (sched: RoutineSchedule | undefined) => {
    const days = sched?.daysOfWeek ?? [];
    const hour = sched?.hour ?? null;
    if (days.length === 0 && hour === null) return 'Sin programación';
    const labels = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    const daysText = days.length
      ? days
          .sort((a, b) => a - b)
          .map((d) => labels[d] ?? String(d))
          .join(' ')
      : 'Sin días';
    const hourText = hour === null ? '' : ` · ${String(hour).padStart(2, '0')}:00`;
    return `${daysText}${hourText}`;
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedRoutineQuery(routineQuery);
    }, 250);
    return () => window.clearTimeout(id);
  }, [routineQuery]);

  useEffect(() => {
    if (selectedRoutineId) void loadTasks(selectedRoutineId);
  }, [selectedRoutineId, loadTasks]);

  useEffect(() => {
    // Only clear a selection once we have a settled (non-stale) routine list: right after a
    // routine is created elsewhere (e.g. the dashboard wizard), this query may still be
    // fetching/invalidating and a stale list must not be mistaken for "this routine is gone".
    if (routinesQuery.isLoading || routinesQuery.isFetching) return;
    if (selectedRoutineId && !routines.some((r) => r.id === selectedRoutineId)) {
      selectRoutine(null);
    }
  }, [
    selectedRoutineId,
    routines,
    selectRoutine,
    routinesQuery.isLoading,
    routinesQuery.isFetching,
  ]);

  const selectedRoutine = useMemo(
    () => routines.find((r) => r.id === selectedRoutineId) ?? null,
    [routines, selectedRoutineId],
  );

  const tasks = useMemo(
    () => (selectedRoutineId ? (tasksByRoutineId[selectedRoutineId] ?? []) : []),
    [selectedRoutineId, tasksByRoutineId],
  );

  const taskBeingEdited = useMemo(
    () => tasks.find((t) => t.id === editTaskId) ?? null,
    [tasks, editTaskId],
  );

  const filteredRoutines = useMemo(() => {
    return [...routines].sort((a, b) => {
      const af = favoriteIds.has(a.id) ? 1 : 0;
      const bf = favoriteIds.has(b.id) ? 1 : 0;
      return bf - af;
    });
  }, [routines, favoriteIds]);

  const toggleFavorite = (routineId: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(routineId)) next.delete(routineId);
      else next.add(routineId);
      try {
        localStorage.setItem('nr-fav-routines', JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  if (panelCollapsed) {
    return (
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold">Rutinas y tareas</div>
            <div className={'text-xs ' + subtleText}>
              Panel minimizado. Vuelve a abrirlo cuando lo necesites.
            </div>
          </div>
          <Button variant="secondary" onClick={() => persistPanelCollapsed(false)}>
            Abrir panel
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <div className="text-sm font-semibold">Rutinas y tareas</div>
        <div className={'text-xs ' + subtleText}>
          Las tareas pertenecen a una rutina. La fecha/hora se define en cada tarea.
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RoutineFormModal
          open={editOpen}
          title="Editar rutina"
          confirmLabel="Guardar"
          loading={actionLoading}
          initialValues={{
            title: selectedRoutine?.title ?? '',
            notes: selectedRoutine?.notes ?? '',
          }}
          onClose={() => setEditOpen(false)}
          onConfirm={async (values) => {
            if (!selectedRoutine) return;
            await editRoutine({
              id: selectedRoutine.id,
              title: values.title,
              notes: values.notes?.trim() ? values.notes.trim() : null,
            });
            await queryClient.invalidateQueries({ queryKey: ['routines', user?.id] });
            await queryClient.invalidateQueries({ queryKey: ['routines', 'search', user?.id] });
          }}
        />
        <TaskFormModal
          open={editTaskId !== null}
          loading={actionLoading}
          initialValues={{
            title: taskBeingEdited?.title ?? '',
            description: taskBeingEdited?.description ?? '',
            due_date: taskBeingEdited?.due_date ?? '',
            due_time: taskBeingEdited?.due_time ? String(taskBeingEdited.due_time).slice(0, 5) : '',
            is_recurring: taskBeingEdited?.is_recurring ?? false,
            recurrence_days_of_week: taskBeingEdited?.recurrence_days_of_week ?? [],
          }}
          onClose={() => setEditTaskId(null)}
          onConfirm={async (values) => {
            if (!taskBeingEdited || !selectedRoutineId) return;
            await editTask({
              id: taskBeingEdited.id,
              routine_id: selectedRoutineId,
              title: values.title.trim(),
              description: values.description?.trim() ? values.description.trim() : null,
              due_date: values.due_date?.trim() ? values.due_date.trim() : null,
              due_time: values.due_time?.trim() ? values.due_time.trim() : null,
              is_recurring: values.is_recurring,
              recurrence_days_of_week: values.recurrence_days_of_week,
            });
          }}
        />
        <Card className="lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Rutinas</div>
              <div className={'text-xs ' + subtleText}>Privadas: solo tú puedes verlas</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  void queryClient.invalidateQueries({ queryKey: ['routines', user?.id] });
                  if (debouncedRoutineQuery.trim().length > 0) {
                    void queryClient.invalidateQueries({
                      queryKey: ['routines', 'search', user?.id],
                    });
                  }
                }}
                disabled={routinesLoading}
              >
                Refrescar
              </Button>
            </div>
          </div>

          <div className="mb-3">
            <Input
              placeholder="Buscar rutina…"
              aria-label="Buscar rutina"
              value={routineQuery}
              onChange={(e) => setRoutineQuery(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            {filteredRoutines.length === 0 ? (
              <div className={emptyStateClass}>Aún no tienes rutinas.</div>
            ) : (
              <div className="space-y-2">
                {filteredRoutines.map((r) => (
                  <div key={r.id} className="flex items-stretch gap-2">
                    <button
                      className={routineItemClass(r.id === selectedRoutineId) + ' flex-1'}
                      onClick={() => selectRoutine(r.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{r.title}</div>
                        {favoriteIds.has(r.id) ? (
                          <span
                            className={isDay ? 'text-amber-500' : 'text-amber-300'}
                            aria-label="Favorita"
                          >
                            ★
                          </span>
                        ) : null}
                      </div>
                      {r.notes ? <div className="mt-1 text-xs opacity-80">{r.notes}</div> : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(r.id)}
                      className={
                        'grid w-10 place-items-center rounded-lg text-sm ring-1 transition ' +
                        (isDay
                          ? 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                          : 'bg-white/5 text-slate-200 ring-white/10 hover:bg-white/7')
                      }
                      aria-label={
                        favoriteIds.has(r.id) ? 'Quitar de favoritas' : 'Marcar como favorita'
                      }
                      title={favoriteIds.has(r.id) ? 'Quitar de favoritas' : 'Marcar como favorita'}
                    >
                      {favoriteIds.has(r.id) ? '★' : '☆'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {routinesError ? <div className="mt-3 text-sm text-rose-600">{routinesError}</div> : null}
        </Card>

        <Card className="lg:col-span-2">
          {!selectedRoutine ? (
            <div className={'text-sm ' + secondaryText}>Selecciona una rutina para ver tareas.</div>
          ) : (
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{selectedRoutine.title}</h2>
                  {selectedRoutine.notes ? (
                    <div className={'text-sm ' + secondaryText}>{selectedRoutine.notes}</div>
                  ) : null}

                  <div className="mt-2">
                    <div className={'text-xs ' + subtleText}>Programación (para “Hoy/Próximo”)</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <div
                        className={
                          'rounded-lg px-2 py-1 text-xs ring-1 ' +
                          (isDay
                            ? 'bg-slate-50 text-slate-700 ring-slate-200'
                            : 'bg-white/5 text-slate-200 ring-white/10')
                        }
                      >
                        {scheduleSummary(prefs.routineScheduleById[selectedRoutine.id])}
                      </div>
                      <button
                        type="button"
                        className={
                          'text-xs underline ' + (isDay ? 'text-slate-700' : 'text-slate-200')
                        }
                        onClick={() => setScheduleOpen((v) => !v)}
                      >
                        {/* Distinct from the "Editar" routine button below: two controls with
                            the same accessible name on one screen is a real a11y ambiguity,
                            not just a testing inconvenience. */}
                        {scheduleOpen ? 'Ocultar programación' : 'Editar programación'}
                      </button>
                    </div>

                    {scheduleOpen ? (
                      <div
                        className={
                          isDay
                            ? 'mt-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200'
                            : 'mt-2 rounded-lg bg-white/5 p-3 ring-1 ring-white/10'
                        }
                      >
                        <div className={'text-xs ' + subtleText}>Días</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((label, dow) => {
                            const current = prefs.routineScheduleById[selectedRoutine.id] as
                              RoutineSchedule | undefined;
                            const days = current?.daysOfWeek ?? [];
                            const active = days.includes(dow);
                            return (
                              <button
                                key={dow}
                                type="button"
                                className={dayPillClass(active)}
                                onClick={() => {
                                  const nextDays = active
                                    ? days.filter((x) => x !== dow)
                                    : [...days, dow].sort((a, b) => a - b);
                                  prefs.setRoutineSchedule(selectedRoutine.id, {
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

                        <div className={'mt-3 text-xs ' + subtleText}>Hora (opcional)</div>
                        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Input
                            type="number"
                            min={0}
                            max={23}
                            placeholder="0-23"
                            value={prefs.routineScheduleById[selectedRoutine.id]?.hour ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              const nextHour =
                                raw === '' ? null : Math.max(0, Math.min(23, Number(raw)));
                              const current = prefs.routineScheduleById[selectedRoutine.id] as
                                RoutineSchedule | undefined;
                              prefs.setRoutineSchedule(selectedRoutine.id, {
                                daysOfWeek: current?.daysOfWeek ?? [],
                                hour: nextHour,
                              });
                            }}
                          />
                          <Button
                            variant="secondary"
                            onClick={() => {
                              const current = prefs.routineScheduleById[selectedRoutine.id] as
                                RoutineSchedule | undefined;
                              prefs.setRoutineSchedule(selectedRoutine.id, {
                                daysOfWeek: current?.daysOfWeek ?? [],
                                hour: null,
                              });
                            }}
                          >
                            Limpiar
                          </Button>
                        </div>
                        <div className={'mt-2 text-xs ' + subtleText}>
                          Solo organiza cómo ves esta rutina en Hoy/Próximo — no envía
                          notificaciones. Para recordatorios por email, usa los ajustes de
                          recordatorio en el panel de personalización.
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    disabled={offline}
                    variant="secondary"
                    onClick={() => {
                      setEditOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    disabled={offline}
                    variant="danger"
                    onClick={() => {
                      if (confirm('¿Eliminar esta rutina?')) {
                        void (async () => {
                          await removeRoutine(selectedRoutine.id);
                          selectRoutine(null);
                          await queryClient.invalidateQueries({ queryKey: ['routines', user?.id] });
                          await queryClient.invalidateQueries({
                            queryKey: ['routines', 'search', user?.id],
                          });
                        })();
                      }
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-sm font-semibold">Tareas</div>
                <div className={'mb-2 text-xs ' + subtleText}>
                  Estas tareas viven dentro de esta rutina. Si pones fecha/hora, aparecen como
                  planificadas.
                </div>

                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    className={'text-xs underline ' + (isDay ? 'text-slate-700' : 'text-slate-200')}
                    onClick={() => {
                      setBulkMode((v) => !v);
                      setBulkText('');
                    }}
                  >
                    {bulkMode ? 'Volver a una sola' : 'Añadir varias'}
                  </button>
                </div>

                {bulkMode ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder={
                        'Escribe una tarea por línea\nEj: Tomar agua\nEj: 10 min estiramiento\nEj: Revisar agenda'
                      }
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      className={isDay ? '' : 'bg-slate-950/40 ring-white/10'}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        disabled={
                          offline ||
                          !user ||
                          !selectedRoutineId ||
                          actionLoading ||
                          bulkText.trim().length === 0
                        }
                        onClick={async () => {
                          if (!user) return;
                          if (!selectedRoutineId) return;
                          if (offline) return;
                          const lines = bulkText
                            .split(/\r?\n/)
                            .map((x) => x.trim())
                            .filter(Boolean)
                            .slice(0, 20);

                          for (const title of lines) {
                            await addTask({
                              user_id: user.id,
                              routine_id: selectedRoutineId,
                              title,
                            });
                          }
                          setBulkText('');
                        }}
                      >
                        Añadir tareas
                      </Button>
                      <Button variant="secondary" onClick={() => setBulkText('')}>
                        Limpiar
                      </Button>
                    </div>
                    <div className={'text-xs ' + subtleText}>Tip: máximo 20 tareas por batch.</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nueva tarea (paso pequeño)…"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                      />
                      <Button
                        disabled={offline || !user || !newTaskTitle.trim() || actionLoading}
                        onClick={() => {
                          if (!user) return;
                          if (!selectedRoutineId) return;
                          void addTask({
                            user_id: user.id,
                            routine_id: selectedRoutineId,
                            title: newTaskTitle.trim(),
                            due_date: newTaskRecurring ? null : newTaskDueDate || null,
                            is_recurring: newTaskRecurring,
                          });
                          setNewTaskTitle('');
                          setNewTaskRecurring(false);
                          setNewTaskDueDate('');
                        }}
                      >
                        Añadir
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className={dayPillClass(
                          !newTaskRecurring && newTaskDueDate === localDateKey(0),
                        )}
                        onClick={() => {
                          setNewTaskRecurring(false);
                          setNewTaskDueDate((d) => (d === localDateKey(0) ? '' : localDateKey(0)));
                        }}
                      >
                        Hoy
                      </button>
                      <button
                        type="button"
                        className={dayPillClass(
                          !newTaskRecurring && newTaskDueDate === localDateKey(1),
                        )}
                        onClick={() => {
                          setNewTaskRecurring(false);
                          setNewTaskDueDate((d) => (d === localDateKey(1) ? '' : localDateKey(1)));
                        }}
                      >
                        Mañana
                      </button>
                      <input
                        type="date"
                        aria-label="Elegir fecha para la tarea"
                        value={newTaskDueDate}
                        disabled={newTaskRecurring}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className={cn(
                          'h-8 rounded-lg px-2 text-xs ring-1 disabled:opacity-50',
                          isDay
                            ? 'bg-white text-slate-700 ring-slate-200'
                            : 'bg-slate-950/40 text-slate-200 ring-white/10',
                        )}
                      />
                      <label className={'flex items-center gap-2 text-xs ' + subtleText}>
                        <input
                          type="checkbox"
                          checked={newTaskRecurring}
                          onChange={(e) => {
                            setNewTaskRecurring(e.target.checked);
                            if (e.target.checked) setNewTaskDueDate('');
                          }}
                        />
                        Repetir cada día (hábito)
                      </label>
                    </div>
                  </div>
                )}

                <div className="mt-3 space-y-2">
                  {tasks.length === 0 ? (
                    <div className={emptyStateClass}>Aún no hay tareas.</div>
                  ) : (
                    tasks.map((t) => {
                      const syncIssue = offlineSyncIssues.find((i) => i.localId === t.id);

                      if (syncIssue) {
                        return (
                          <div
                            key={t.id}
                            className={
                              'flex items-center justify-between gap-3 rounded-lg p-3 ring-1 ' +
                              (isDay
                                ? 'bg-amber-50 ring-amber-200'
                                : 'bg-amber-500/10 ring-amber-500/20')
                            }
                          >
                            <div className="text-sm">
                              <div className="font-medium">{t.title}</div>
                              <div
                                className={
                                  'mt-0.5 text-xs ' + (isDay ? 'text-amber-800' : 'text-amber-200')
                                }
                              >
                                No se pudo sincronizar: {syncIssue.message}
                              </div>
                            </div>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                if (confirm('¿Descartar esta tarea sin guardarla?')) {
                                  void discardOfflineTask(t.id);
                                }
                              }}
                            >
                              Descartar
                            </Button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={t.id}
                          className={
                            'flex items-center justify-between gap-3 rounded-lg p-3 ring-1 ' +
                            (isDay ? 'bg-white ring-slate-200' : 'bg-white/5 ring-white/10')
                          }
                        >
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={t.is_done}
                              disabled={offline}
                              onChange={(e) => {
                                if (!selectedRoutineId) return;
                                if (offline) return;
                                void setTaskDone({
                                  id: t.id,
                                  routine_id: selectedRoutineId,
                                  is_done: e.target.checked,
                                });
                              }}
                            />
                            <span className={t.is_done ? 'line-through text-slate-400' : ''}>
                              {t.title}
                              {t.is_recurring ? (
                                <span
                                  className={
                                    'ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ' +
                                    (isDay
                                      ? 'bg-slate-100 text-slate-600 ring-slate-200'
                                      : 'bg-white/10 text-slate-200 ring-white/10')
                                  }
                                >
                                  {recurrenceBadgeText(t.recurrence_days_of_week)}
                                </span>
                              ) : null}
                              {t.due_date || t.due_time || t.description ? (
                                <span className={'ml-2 text-xs ' + subtleText}>
                                  {t.description ? `· ${t.description}` : ''}
                                  {t.due_date ? ` · ${t.due_date}` : ''}
                                  {t.due_time ? ` · ${String(t.due_time).slice(0, 5)}` : ''}
                                </span>
                              ) : null}
                            </span>
                          </label>
                          <div className="flex flex-shrink-0 items-center gap-2">
                            {!t.is_recurring && !t.is_done ? (
                              <Button
                                variant="secondary"
                                disabled={offline}
                                title="Mover esta tarea a mañana"
                                onClick={() => {
                                  if (!selectedRoutineId) return;
                                  void postponeTask({ id: t.id, routine_id: selectedRoutineId });
                                }}
                              >
                                Posponer
                              </Button>
                            ) : null}
                            <Button
                              variant="secondary"
                              disabled={offline}
                              aria-label={`Editar tarea: ${t.title}`}
                              onClick={() => setEditTaskId(t.id)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="danger"
                              disabled={offline}
                              aria-label={`Quitar tarea: ${t.title}`}
                              onClick={() => {
                                if (!selectedRoutineId) return;
                                if (confirm('¿Eliminar esta tarea?')) {
                                  void removeTask({ id: t.id, routine_id: selectedRoutineId });
                                }
                              }}
                            >
                              Quitar
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
