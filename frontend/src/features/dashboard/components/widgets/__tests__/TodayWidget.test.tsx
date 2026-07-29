import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodayWidget } from '../TodayWidget';
import type { Routine, RoutineTask } from '@/shared/types/routines';

function routine(id: string, title: string): Routine {
  return {
    id,
    user_id: 'u1',
    title,
    notes: null,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
  };
}

function task(id: string, routineId: string, title: string, isDone = false): RoutineTask {
  return {
    id,
    user_id: 'u1',
    routine_id: routineId,
    title,
    is_done: isDone,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
  };
}

function renderWidget(props: Partial<React.ComponentProps<typeof TodayWidget>> = {}) {
  return render(
    <TodayWidget
      riskText="Bajo riesgo"
      lastActivity={null}
      scheduledToday={[]}
      tasksByRoutineId={{}}
      onStartSession={() => {}}
      onCustomize={() => {}}
      todayFocus={[]}
      routines={[]}
      offline={false}
      onSetTaskDone={() => {}}
      routineTitleById={new Map()}
      isDay
      subtleText="text-slate-600"
      panelText="text-slate-700"
      collapsed={false}
      onToggleCollapsed={() => {}}
      {...props}
    />,
  );
}

describe('TodayWidget', () => {
  it('shows the risk summary', () => {
    renderWidget({ riskText: 'En riesgo de perder la racha' });
    expect(screen.getByText('En riesgo de perder la racha')).toBeInTheDocument();
  });

  it('prompts to create the first routine when there are none', () => {
    renderWidget({ routines: [] });
    expect(screen.getByText('Crea tu primera rutina para empezar.')).toBeInTheDocument();
  });

  it('says there are no recent pending tasks once at least one routine exists', () => {
    renderWidget({ routines: [routine('r1', 'Mañana enfocada')], todayFocus: [] });
    expect(
      screen.getByText(
        'No hay pendientes recientes. Puedes abrir una rutina y marcar una tarea para sumar hoy.',
      ),
    ).toBeInTheDocument();
  });

  it('offers to schedule routines when none are scheduled today', async () => {
    const user = userEvent.setup();
    const onCustomize = vi.fn();
    renderWidget({ scheduledToday: [], onCustomize });

    expect(screen.getByText('Aún no has programado rutinas para hoy.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Programar' }));
    expect(onCustomize).toHaveBeenCalled();
  });

  it('lists scheduled routines and starts a session on click', async () => {
    const user = userEvent.setup();
    const onStartSession = vi.fn();
    renderWidget({
      scheduledToday: [routine('r1', 'Mañana enfocada')],
      tasksByRoutineId: { r1: [task('t1', 'r1', 'Agua', true)] },
      onStartSession,
    });

    expect(screen.getByText('Mañana enfocada')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Empezar' }));
    expect(onStartSession).toHaveBeenCalledWith('r1');
  });

  it('toggles a focus task on click and skips it while offline', async () => {
    const user = userEvent.setup();
    const onSetTaskDone = vi.fn();
    renderWidget({
      todayFocus: [task('t1', 'r1', 'Tomar agua')],
      routineTitleById: new Map([['r1', 'Mañana enfocada']]),
      onSetTaskDone,
    });

    await user.click(screen.getByRole('button', { name: /Tomar agua/ }));
    expect(onSetTaskDone).toHaveBeenCalledWith({ id: 't1', routine_id: 'r1', is_done: true });

    onSetTaskDone.mockClear();
    renderWidget({
      todayFocus: [task('t2', 'r1', 'Offline task')],
      offline: true,
      onSetTaskDone,
    });
    await user.click(screen.getByRole('button', { name: /Offline task/ }));
    expect(onSetTaskDone).not.toHaveBeenCalled();
  });

  it('renders a completed task and the night theme', () => {
    renderWidget({
      isDay: false,
      scheduledToday: [],
      routines: [routine('r1', 'Mañana enfocada')],
      todayFocus: [task('t1', 'r1', 'Tomar agua', true)],
    });

    expect(screen.getByRole('button', { name: /Tomar agua/ })).toBeInTheDocument();
  });

  it('shows the last activity timestamp when present', () => {
    const lastActivity = new Date(2026, 6, 27, 10, 30);
    renderWidget({ lastActivity });
    expect(screen.getByText(lastActivity.toLocaleString())).toBeInTheDocument();
  });

  it('falls back to an empty task list for a scheduled routine with no bucket', () => {
    renderWidget({ scheduledToday: [routine('r1', 'Mañana enfocada')], tasksByRoutineId: {} });
    expect(screen.getByText('0 tareas • 0 hechas')).toBeInTheDocument();
  });
});
