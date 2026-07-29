import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoutinesWidget } from '../RoutinesWidget';
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

function task(id: string, routineId: string, isDone: boolean): RoutineTask {
  return {
    id,
    user_id: 'u1',
    routine_id: routineId,
    title: `task-${id}`,
    is_done: isDone,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
  };
}

describe('RoutinesWidget', () => {
  it('shows a loading skeleton', () => {
    render(
      <RoutinesWidget
        loading
        routines={[]}
        tasksByRoutineId={{}}
        onStartSession={() => {}}
        isDay
        subtleText="text-slate-600"
        panelText="text-slate-700"
        collapsed={false}
        onToggleCollapsed={() => {}}
      />,
    );

    expect(screen.queryByText(/Tus rutinas aparecerán/)).not.toBeInTheDocument();
  });

  it('shows an empty state pointing at "Nueva rutina" when there are no routines', () => {
    render(
      <RoutinesWidget
        loading={false}
        routines={[]}
        tasksByRoutineId={{}}
        onStartSession={() => {}}
        isDay
        subtleText="text-slate-600"
        panelText="text-slate-700"
        collapsed={false}
        onToggleCollapsed={() => {}}
      />,
    );

    expect(screen.getByText(/Tus rutinas aparecerán aquí/)).toBeInTheDocument();
  });

  it('lists routines with completion percentage and starts a session on click', async () => {
    const user = userEvent.setup();
    const onStartSession = vi.fn();

    render(
      <RoutinesWidget
        loading={false}
        routines={[routine('r1', 'Mañana enfocada')]}
        tasksByRoutineId={{ r1: [task('t1', 'r1', true), task('t2', 'r1', false)] }}
        onStartSession={onStartSession}
        isDay
        subtleText="text-slate-600"
        panelText="text-slate-700"
        collapsed={false}
        onToggleCollapsed={() => {}}
      />,
    );

    expect(screen.getByText('Mañana enfocada')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();

    await user.click(screen.getByText('Mañana enfocada'));
    expect(onStartSession).toHaveBeenCalledWith('r1');

    await user.click(screen.getByRole('button', { name: 'Ver todas' }));
    expect(onStartSession).toHaveBeenCalledWith(null);
  });

  it('shows 0% for a routine with no task bucket, in the night theme', () => {
    render(
      <RoutinesWidget
        loading={false}
        routines={[routine('r1', 'Sin tareas')]}
        tasksByRoutineId={{}}
        onStartSession={() => {}}
        isDay={false}
        subtleText="text-slate-300"
        panelText="text-slate-200"
        collapsed={false}
        onToggleCollapsed={() => {}}
      />,
    );

    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
