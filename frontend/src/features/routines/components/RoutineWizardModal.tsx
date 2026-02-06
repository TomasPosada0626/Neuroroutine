import { useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/authStore'
import { useRoutines } from '@/features/routines/routinesStore'
import { Button, Input, Modal, Textarea } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { useUiStore } from '@/shared/state/uiStore'

type TaskDraft = {
  title: string
  description: string
  due_date: string
  due_time: string
}

type Props = {
  open: boolean
  onClose: () => void
  onCreated?: (routineId: string) => void
}

function normalizeTimeInput(raw: string) {
  const v = raw.trim()
  if (!v) return ''
  // accept HH:MM or HH:MM:SS and keep HH:MM
  const m = v.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return v
  const hh = String(Math.max(0, Math.min(23, Number(m[1])))).padStart(2, '0')
  const mm = String(Math.max(0, Math.min(59, Number(m[2])))).padStart(2, '0')
  return `${hh}:${mm}`
}

export function RoutineWizardModal({ open, onClose, onCreated }: Props) {
  const { user } = useAuth()
  const theme = useUiStore((s) => s.theme)
  const isDay = theme === 'day'
  const subtleText = isDay ? 'text-slate-600' : 'text-slate-300'

  const { offline, addRoutine, addTasksBulk } = useRoutines()

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [tasks, setTasks] = useState<TaskDraft[]>([{ title: '', description: '', due_date: '', due_time: '' }])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = useMemo(() => {
    if (!user) return false
    if (offline) return false
    if (!title.trim()) return false
    return true
  }, [user, offline, title])

  const reset = () => {
    setTitle('')
    setNotes('')
    setTasks([{ title: '', description: '', due_date: '', due_time: '' }])
    setError(null)
  }

  const footer = (
    <>
      <Button
        variant="secondary"
        type="button"
        onClick={() => {
          onClose()
          reset()
        }}
        disabled={submitting}
      >
        Cancelar
      </Button>
      <Button
        type="button"
        disabled={!canSubmit || submitting}
        onClick={async () => {
          setError(null)
          setSubmitting(true)
          try {
            if (!user) throw new Error('Debes iniciar sesión')
            if (offline) throw new Error('Estás en modo offline')

            const created = await addRoutine({
              user_id: user.id,
              title: title.trim(),
              notes: notes.trim() ? notes.trim() : null,
            })

            const normalizedTasks = tasks
              .map((t) => ({
                title: t.title.trim(),
                description: t.description.trim(),
                due_date: t.due_date.trim(),
                due_time: normalizeTimeInput(t.due_time),
              }))
              .filter((t) => t.title.length > 0)

            if (normalizedTasks.length) {
              await addTasksBulk({
                user_id: user.id,
                routine_id: created.id,
                tasks: normalizedTasks.map((t) => ({
                  title: t.title,
                  description: t.description ? t.description : null,
                  due_date: t.due_date ? t.due_date : null,
                  due_time: t.due_time ? t.due_time : null,
                })),
              })
            }

            onCreated?.(created.id)
            onClose()
            reset()
          } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo crear la rutina')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        Crear rutina
      </Button>
    </>
  )

  return (
    <Modal
      open={open}
      title="Crear rutina"
      description="Ponle un nombre y agrega las tareas debajo. Las tareas quedan dentro de esta rutina."
      onClose={() => {
        onClose()
        reset()
      }}
      footer={footer}
    >
      <div className="space-y-4">
        {offline ? (
          <div className={cn('rounded-lg p-3 text-sm ring-1', isDay ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-white/5 text-slate-200 ring-white/10')}>
            Modo offline: puedes ver, pero no crear.
          </div>
        ) : null}

        <div className="space-y-2">
          <div>
            <div className="text-sm font-semibold">Nombre de la rutina</div>
            <div className={cn('text-xs', subtleText)}>Ej: Mañana, Gym, Estudio</div>
          </div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Mañana enfocada" />
        </div>

        <div className="space-y-2">
          <div>
            <div className="text-sm font-semibold">Notas (opcional)</div>
            <div className={cn('text-xs', subtleText)}>Reglas, intención, recordatorios.</div>
          </div>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Pequeñas reglas, intención, recordatorios…" />
        </div>

        <div className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-slate-50 ring-slate-200' : 'bg-white/5 ring-white/10')}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Tareas dentro de la rutina</div>
              <div className={cn('mt-0.5 text-xs', subtleText)}>Puedes agregar todas las que quieras. Fecha/hora son opcionales.</div>
            </div>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setTasks((prev) => [...prev, { title: '', description: '', due_date: '', due_time: '' }])}
            >
              + Tarea
            </Button>
          </div>

          <div className="mt-3 space-y-3">
            {tasks.map((t, idx) => (
              <div
                key={idx}
                className={cn('rounded-lg p-3 ring-1', isDay ? 'bg-white ring-slate-200' : 'bg-slate-950/20 ring-white/10')}
              >
                <div className="grid gap-3 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <div className={cn('text-xs', subtleText)}>Nombre</div>
                    <Input
                      value={t.title}
                      onChange={(e) =>
                        setTasks((prev) => prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)))
                      }
                      placeholder="Ej: Tomar agua"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <div className={cn('text-xs', subtleText)}>Descripción (opcional)</div>
                    <Input
                      value={t.description}
                      onChange={(e) =>
                        setTasks((prev) => prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))
                      }
                      placeholder="Ej: 2 litros"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className={cn('text-xs', subtleText)}>Fecha</div>
                    <Input
                      type="date"
                      value={t.due_date}
                      onChange={(e) =>
                        setTasks((prev) => prev.map((x, i) => (i === idx ? { ...x, due_date: e.target.value } : x)))
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className={cn('text-xs', subtleText)}>Hora</div>
                    <Input
                      type="time"
                      value={normalizeTimeInput(t.due_time)}
                      onChange={(e) =>
                        setTasks((prev) => prev.map((x, i) => (i === idx ? { ...x, due_time: e.target.value } : x)))
                      }
                    />
                  </div>

                  <div className="md:col-span-12">
                    <div className="flex items-center justify-between">
                      <div className={cn('text-xs', subtleText)}>
                        {idx === 0 ? 'Tip: deja la fecha vacía si es recurrente.' : ''}
                      </div>
                      <button
                        type="button"
                        className={cn('text-xs underline', isDay ? 'text-slate-700' : 'text-slate-200')}
                        onClick={() => setTasks((prev) => prev.filter((_, i) => i !== idx))}
                        disabled={tasks.length === 1}
                        title={tasks.length === 1 ? 'Debe existir al menos una fila' : 'Eliminar'}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error ? <div className="text-sm text-rose-600">{error}</div> : null}
      </div>
    </Modal>
  )
}
