import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/authStore'
import { useRoutines } from '@/features/routines/routinesStore'
import { RoutineFormModal } from '@/features/routines/components'
import { Button, Card, Input } from '@/shared/ui'
import { useUiStore } from '@/shared/state/uiStore'

type Props = {
  onCreateRoutine?: () => void
}

export function RoutinePanel({ onCreateRoutine }: Props) {
  const { user } = useAuth()
  const theme = useUiStore((s) => s.theme)
  const isDay = theme === 'day'

  const subtleText = isDay ? 'text-slate-500' : 'text-slate-300'
  const secondaryText = isDay ? 'text-slate-600' : 'text-slate-200'

  const emptyStateClass = isDay
    ? 'rounded-lg bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200'
    : 'rounded-lg bg-white/5 p-3 text-sm text-slate-200 ring-1 ring-white/10'

  const routineItemClass = (selected: boolean) => {
    const base = 'w-full rounded-lg px-3 py-2 text-left text-sm ring-1 transition '
    if (isDay) {
      return (
        base + (selected ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white ring-slate-200 hover:bg-slate-50')
      )
    }

    return base + (selected ? 'bg-white/12 text-white ring-white/20' : 'bg-white/5 text-slate-50 ring-white/10 hover:bg-white/7')
  }
  const {
    loading,
    error,
    routines,
    selectedRoutineId,
    tasksByRoutineId,
    loadRoutines,
    selectRoutine,
    editRoutine,
    removeRoutine,
    loadTasks,
    addTask,
    setTaskDone,
    removeTask,
  } = useRoutines()

  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [routineQuery, setRoutineQuery] = useState('')
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('nr-fav-routines')
      const ids = raw ? (JSON.parse(raw) as string[]) : []
      return new Set(ids)
    } catch {
      return new Set()
    }
  })

  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    void loadRoutines()
  }, [loadRoutines])

  useEffect(() => {
    if (selectedRoutineId) void loadTasks(selectedRoutineId)
  }, [selectedRoutineId, loadTasks])

  const selectedRoutine = useMemo(
    () => routines.find((r) => r.id === selectedRoutineId) ?? null,
    [routines, selectedRoutineId],
  )

  const tasks = selectedRoutineId ? tasksByRoutineId[selectedRoutineId] ?? [] : []

  const filteredRoutines = useMemo(() => {
    const q = routineQuery.trim().toLowerCase()
    const base = q ? routines.filter((r) => r.title.toLowerCase().includes(q)) : routines
    return [...base].sort((a, b) => {
      const af = favoriteIds.has(a.id) ? 1 : 0
      const bf = favoriteIds.has(b.id) ? 1 : 0
      return bf - af
    })
  }, [routines, routineQuery, favoriteIds])

  const toggleFavorite = (routineId: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (next.has(routineId)) next.delete(routineId)
      else next.add(routineId)
      try {
        localStorage.setItem('nr-fav-routines', JSON.stringify(Array.from(next)))
      } catch {
        // ignore
      }
      return next
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <RoutineFormModal
        open={editOpen}
        title="Editar rutina"
        confirmLabel="Guardar"
        loading={loading}
        initialValues={{
          title: selectedRoutine?.title ?? '',
          notes: selectedRoutine?.notes ?? '',
        }}
        onClose={() => setEditOpen(false)}
        onConfirm={async (values) => {
          if (!selectedRoutine) return
          await editRoutine({
            id: selectedRoutine.id,
            title: values.title,
            notes: values.notes?.trim() ? values.notes.trim() : null,
          })
        }}
      />

      <Card className="lg:col-span-1">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Rutinas</div>
            <div className={'text-xs ' + subtleText}>Solo las tuyas (RLS)</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onCreateRoutine} disabled={!user || loading || !onCreateRoutine}>
              Nueva
            </Button>
            <Button variant="secondary" onClick={() => void loadRoutines()} disabled={loading}>
              Refrescar
            </Button>
          </div>
        </div>

        <div className="mb-3">
          <Input
            placeholder="Buscar rutina…"
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
                        <span className={isDay ? 'text-amber-500' : 'text-amber-300'} aria-label="Favorita">
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
                    aria-label={favoriteIds.has(r.id) ? 'Quitar de favoritas' : 'Marcar como favorita'}
                    title={favoriteIds.has(r.id) ? 'Quitar de favoritas' : 'Marcar como favorita'}
                  >
                    {favoriteIds.has(r.id) ? '★' : '☆'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error ? <div className="mt-3 text-sm text-rose-600">{error}</div> : null}
      </Card>

      <Card className="lg:col-span-2">
        {!selectedRoutine ? (
          <div className={'text-sm ' + secondaryText}>Selecciona una rutina para ver tareas.</div>
        ) : (
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-lg font-semibold">{selectedRoutine.title}</div>
                {selectedRoutine.notes ? (
                  <div className={'text-sm ' + secondaryText}>{selectedRoutine.notes}</div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditOpen(true)
                  }}
                >
                  Editar
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm('¿Eliminar esta rutina?')) {
                      void removeRoutine(selectedRoutine.id)
                      selectRoutine(null)
                    }
                  }}
                >
                  Eliminar
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-sm font-semibold">Tareas</div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nueva tarea…"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
                <Button
                  disabled={!user || !newTaskTitle.trim() || loading}
                  onClick={() => {
                    if (!user) return
                    if (!selectedRoutineId) return
                    void addTask({ user_id: user.id, routine_id: selectedRoutineId, title: newTaskTitle.trim() })
                    setNewTaskTitle('')
                  }}
                >
                  Añadir
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                {tasks.length === 0 ? (
                  <div className={emptyStateClass}>Aún no hay tareas.</div>
                ) : (
                  tasks.map((t) => (
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
                          onChange={(e) => {
                            if (!selectedRoutineId) return
                            void setTaskDone({
                              id: t.id,
                              routine_id: selectedRoutineId,
                              is_done: e.target.checked,
                            })
                          }}
                        />
                        <span className={t.is_done ? 'line-through text-slate-400' : ''}>{t.title}</span>
                      </label>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          if (!selectedRoutineId) return
                          void removeTask({ id: t.id, routine_id: selectedRoutineId })
                        }}
                      >
                        Quitar
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
