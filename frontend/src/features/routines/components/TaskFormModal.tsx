import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { taskSchema, type TaskValues } from '@/features/routines/schemas';
import { cn } from '@/shared/lib/cn';
import { Button, Input, Modal, Textarea } from '@/shared/ui';
import { useUiStore } from '@/shared/state/uiStore';

type Props = {
  open: boolean;
  initialValues?: Partial<TaskValues>;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (values: TaskValues) => Promise<void> | void;
};

const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

const emptyValues: TaskValues = {
  title: '',
  description: '',
  due_date: '',
  due_time: '',
  is_recurring: false,
  recurrence_days_of_week: [],
};

export function TaskFormModal({ open, initialValues, loading, onClose, onConfirm }: Props) {
  const theme = useUiStore((s) => s.theme);
  const isDay = theme === 'day';

  const form = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { ...emptyValues, ...initialValues },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ ...emptyValues, ...initialValues });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    initialValues?.title,
    initialValues?.description,
    initialValues?.due_date,
    initialValues?.due_time,
    initialValues?.is_recurring,
    initialValues?.recurrence_days_of_week,
  ]);

  const isRecurring = form.watch('is_recurring');
  const selectedDays = form.watch('recurrence_days_of_week') ?? [];

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await onConfirm(values);
      onClose();
    } catch (e) {
      form.setError('root', { message: e instanceof Error ? e.message : 'Something went wrong' });
    }
  });

  return (
    <Modal
      open={open}
      title="Editar tarea"
      description="Cambia el título, la descripción o cuándo quieres hacerla."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" form="task-form" disabled={loading}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="task-form" className="space-y-3" onSubmit={onSubmit}>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="task-form-title">
            Título
          </label>
          <Input id="task-form-title" placeholder="Ej: Tomar agua" {...form.register('title')} />
          {form.formState.errors.title ? (
            <div className="text-xs text-rose-600">{form.formState.errors.title.message}</div>
          ) : null}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="task-form-description">
            Descripción (opcional)
          </label>
          <Textarea
            id="task-form-description"
            placeholder="Ej: 2 litros"
            {...form.register('description')}
          />
          {form.formState.errors.description ? (
            <div className="text-xs text-rose-600">{form.formState.errors.description.message}</div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="task-form-due-date">
              Fecha (opcional)
            </label>
            <Input
              id="task-form-due-date"
              type="date"
              {...form.register('due_date')}
              disabled={form.watch('is_recurring')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="task-form-due-time">
              Hora (opcional)
            </label>
            <Input id="task-form-due-time" type="time" {...form.register('due_time')} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            {...form.register('is_recurring', {
              onChange: (e) => {
                if (e.target.checked) form.setValue('due_date', '');
              },
            })}
          />
          Repetir cada día (hábito) — el checkbox se reinicia solo cada día
        </label>

        {isRecurring ? (
          <div className="space-y-1">
            <div className="text-sm font-medium">Días de la semana (opcional)</div>
            <div className={cn('text-xs', isDay ? 'text-slate-500' : 'text-slate-400')}>
              Déjalo vacío para repetir todos los días.
            </div>
            <div className="flex flex-wrap gap-2">
              {DAY_LABELS.map((label, dow) => {
                const active = selectedDays.includes(dow);
                return (
                  <button
                    key={dow}
                    type="button"
                    aria-pressed={active}
                    aria-label={`Repetir el día ${label}`}
                    className={cn(
                      'rounded-lg px-2 py-1 text-xs font-medium ring-1 transition',
                      isDay
                        ? active
                          ? 'bg-slate-900 text-white ring-slate-900'
                          : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                        : active
                          ? 'bg-white/15 text-white ring-white/25'
                          : 'bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10',
                    )}
                    onClick={() => {
                      const next = active
                        ? selectedDays.filter((d) => d !== dow)
                        : [...selectedDays, dow].sort((a, b) => a - b);
                      form.setValue('recurrence_days_of_week', next, { shouldDirty: true });
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {form.formState.errors.root ? (
          <div className="text-sm text-rose-600">{form.formState.errors.root.message}</div>
        ) : null}
      </form>
    </Modal>
  );
}
