import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/authStore'
import { useRoutines } from '@/features/routines/routinesStore'
import { RoutineFormModal } from '@/features/routines/components'
import { Button, Card, Input } from '@/shared/ui'

export function RoutinePanel() {
  const { user } = useAuth()
  const {
    loading,
    error,
    routines,
    selectedRoutineId,
    tasksByRoutineId,
    loadRoutines,
    selectRoutine,
    addRoutine,
    editRoutine,
    removeRoutine,
    loadTasks,
    addTask,
    setTaskDone,
    removeTask,
  } = useRoutines()

  const [newTaskTitle, setNewTaskTitle] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
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

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <RoutineFormModal
        open={createOpen}
        title="Nueva rutina"
        confirmLabel="Crear"
        loading={loading}
        initialValues={{ title: '', notes: '' }}
        onClose={() => setCreateOpen(false)}
        onConfirm={async (values) => {
          if (!user) throw new Error('Debes iniciar sesión')
          await addRoutine({
            user_id: user.id,
            title: values.title,
            notes: values.notes?.trim() ? values.notes.trim() : null,
          })
        }}
      />

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
            <div className="text-xs text-slate-500">Solo las tuyas (RLS)</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(true)} disabled={!user || loading}>
              Nueva
            </Button>
            <Button variant="secondary" onClick={() => void loadRoutines()} disabled={loading}>
              Refrescar
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {routines.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200">
              Aún no tienes rutinas.
            </div>
          ) : (
            <div className="space-y-2">
              {routines.map((r) => (
                <button
                  key={r.id}
                  className={
                    'w-full rounded-lg px-3 py-2 text-left text-sm ring-1 transition ' +
                    (r.id === selectedRoutineId
                      ? 'bg-slate-900 text-white ring-slate-900'
                      : 'bg-white ring-slate-200 hover:bg-slate-50')
                  }
                  onClick={() => selectRoutine(r.id)}
                >
                  <div className="font-medium">{r.title}</div>
                  {r.notes ? <div className="mt-1 text-xs opacity-80">{r.notes}</div> : null}
                </button>
              ))}
            </div>
          )}
        </div>

        {error ? <div className="mt-3 text-sm text-rose-600">{error}</div> : null}
      </Card>

      <Card className="lg:col-span-2">
        {!selectedRoutine ? (
          <div className="text-sm text-slate-600">Selecciona una rutina para ver tareas.</div>
        ) : (
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-lg font-semibold">{selectedRoutine.title}</div>
                {selectedRoutine.notes ? (
                  <div className="text-sm text-slate-600">{selectedRoutine.notes}</div>
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
                  <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200">
                    Aún no hay tareas.
                  </div>
                ) : (
                  tasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 ring-1 ring-slate-200"
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
