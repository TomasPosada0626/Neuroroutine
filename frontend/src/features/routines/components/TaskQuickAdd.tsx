import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { Button, Input, Textarea } from '@/shared/ui';

type Props = {
  userId: string | null;
  routineId: string;
  offline: boolean;
  actionLoading: boolean;
  onAddTask: (input: {
    user_id: string;
    routine_id: string;
    title: string;
    due_date?: string | null;
    is_recurring?: boolean;
  }) => Promise<void>;
  isDay: boolean;
  subtleText: string;
};

function localDateKey(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

export function TaskQuickAdd({
  userId,
  routineId,
  offline,
  actionLoading,
  onAddTask,
  isDay,
  subtleText,
}: Props) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskRecurring, setNewTaskRecurring] = useState(false);
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const dayPillClass = (active: boolean) => {
    const base = 'rounded-lg px-2 py-1 text-xs font-medium ring-1 transition';
    if (isDay) {
      return (
        base +
        (active
          ? ' bg-slate-900 text-white ring-slate-900'
          : ' bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')
      );
    }
    return (
      base +
      (active
        ? ' bg-white/15 text-white ring-white/25'
        : ' bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10')
    );
  };

  return (
    <div>
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
              disabled={offline || !userId || actionLoading || bulkText.trim().length === 0}
              onClick={async () => {
                if (!userId) return;
                if (offline) return;
                const lines = bulkText
                  .split(/\r?\n/)
                  .map((x) => x.trim())
                  .filter(Boolean)
                  .slice(0, 20);

                for (const title of lines) {
                  await onAddTask({ user_id: userId, routine_id: routineId, title });
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
              disabled={offline || !userId || !newTaskTitle.trim() || actionLoading}
              onClick={() => {
                if (!userId) return;
                void onAddTask({
                  user_id: userId,
                  routine_id: routineId,
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
              className={dayPillClass(!newTaskRecurring && newTaskDueDate === localDateKey(0))}
              onClick={() => {
                setNewTaskRecurring(false);
                setNewTaskDueDate((d) => (d === localDateKey(0) ? '' : localDateKey(0)));
              }}
            >
              Hoy
            </button>
            <button
              type="button"
              className={dayPillClass(!newTaskRecurring && newTaskDueDate === localDateKey(1))}
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
    </div>
  );
}
