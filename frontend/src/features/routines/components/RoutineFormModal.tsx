import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { routineSchema, type RoutineValues } from '@/features/routines/schemas'
import { Button, Input, Modal, Textarea } from '@/shared/ui'

type Props = {
  open: boolean
  title: string
  initialValues?: Partial<RoutineValues>
  confirmLabel: string
  loading?: boolean
  onClose: () => void
  onConfirm: (values: RoutineValues) => Promise<void> | void
}

export function RoutineFormModal({
  open,
  title,
  initialValues,
  confirmLabel,
  loading,
  onClose,
  onConfirm,
}: Props) {
  const form = useForm<RoutineValues>({
    resolver: zodResolver(routineSchema),
    defaultValues: {
      title: initialValues?.title ?? '',
      notes: initialValues?.notes ?? '',
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      title: initialValues?.title ?? '',
      notes: initialValues?.notes ?? '',
    })
  }, [open, initialValues?.title, initialValues?.notes, form])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await onConfirm(values)
      onClose()
    } catch (e) {
      form.setError('root', { message: e instanceof Error ? e.message : 'Something went wrong' })
    }
  })

  return (
    <Modal
      open={open}
      title={title}
      description="Mantén tus rutinas claras y simples."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" form="routine-form" disabled={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form id="routine-form" className="space-y-3" onSubmit={onSubmit}>
        <div className="space-y-1">
          <label className="text-sm font-medium">Título</label>
          <Input placeholder="Ej: Mañana enfocada" {...form.register('title')} />
          {form.formState.errors.title ? (
            <div className="text-xs text-rose-600">{form.formState.errors.title.message}</div>
          ) : null}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Notas (opcional)</label>
          <Textarea placeholder="Pequeñas reglas, intención, recordatorios…" {...form.register('notes')} />
          {form.formState.errors.notes ? (
            <div className="text-xs text-rose-600">{form.formState.errors.notes.message}</div>
          ) : null}
        </div>

        {form.formState.errors.root ? (
          <div className="text-sm text-rose-600">{form.formState.errors.root.message}</div>
        ) : null}
      </form>
    </Modal>
  )
}
