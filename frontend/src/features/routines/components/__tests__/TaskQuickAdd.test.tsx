import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskQuickAdd } from '../TaskQuickAdd';

function renderQuickAdd(props: Partial<React.ComponentProps<typeof TaskQuickAdd>> = {}) {
  const onAddTask = vi.fn().mockResolvedValue(undefined);
  const utils = render(
    <TaskQuickAdd
      userId="u1"
      routineId="r1"
      offline={false}
      actionLoading={false}
      onAddTask={onAddTask}
      isDay
      subtleText="text-slate-600"
      {...props}
    />,
  );
  return { ...utils, onAddTask };
}

describe('TaskQuickAdd', () => {
  it('adds a single task with the typed title', async () => {
    const user = userEvent.setup();
    const { onAddTask } = renderQuickAdd();

    await user.type(screen.getByPlaceholderText('Nueva tarea (paso pequeño)…'), 'Tomar agua');
    await user.click(screen.getByRole('button', { name: 'Añadir' }));

    expect(onAddTask).toHaveBeenCalledWith({
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Tomar agua',
      due_date: null,
      is_recurring: false,
    });
  });

  it('disables the add button while the title is empty, offline, or loading', () => {
    renderQuickAdd({ offline: true });
    expect(screen.getByRole('button', { name: 'Añadir' })).toBeDisabled();
  });

  it('marks a quick-add task as recurring and clears any picked date', async () => {
    const user = userEvent.setup();
    const { onAddTask } = renderQuickAdd();

    await user.click(screen.getByRole('button', { name: 'Hoy' }));
    await user.click(screen.getByRole('checkbox', { name: 'Repetir cada día (hábito)' }));
    await user.type(screen.getByPlaceholderText('Nueva tarea (paso pequeño)…'), 'Meditar');
    await user.click(screen.getByRole('button', { name: 'Añadir' }));

    expect(onAddTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Meditar', due_date: null, is_recurring: true }),
    );
  });

  it('toggles between Hoy and Mañana quick-pick dates', async () => {
    const user = userEvent.setup();
    renderQuickAdd();

    const hoy = screen.getByRole('button', { name: 'Hoy' });
    const manana = screen.getByRole('button', { name: 'Mañana' });

    await user.click(hoy);
    await user.click(manana);
    await user.click(manana);

    // Clicking the already-active pill again clears the date instead of toggling twice.
    expect(screen.getByLabelText('Elegir fecha para la tarea')).toHaveValue('');
  });

  it('switches to bulk mode and adds up to 20 lines as separate tasks', async () => {
    const user = userEvent.setup();
    const { onAddTask } = renderQuickAdd();

    await user.click(screen.getByRole('button', { name: 'Añadir varias' }));
    await user.type(screen.getByPlaceholderText(/Escribe una tarea por línea/), 'Tarea 1\nTarea 2');
    await user.click(screen.getByRole('button', { name: 'Añadir tareas' }));

    expect(onAddTask).toHaveBeenCalledTimes(2);
    expect(onAddTask).toHaveBeenNthCalledWith(1, {
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Tarea 1',
    });
    expect(onAddTask).toHaveBeenNthCalledWith(2, {
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Tarea 2',
    });
  });

  it('disables bulk add while offline or without a title', async () => {
    const user = userEvent.setup();
    renderQuickAdd();

    await user.click(screen.getByRole('button', { name: 'Añadir varias' }));
    expect(screen.getByRole('button', { name: 'Añadir tareas' })).toBeDisabled();
  });

  it('clears bulk text via "Limpiar" and switches back with "Volver a una sola"', async () => {
    const user = userEvent.setup();
    renderQuickAdd();

    await user.click(screen.getByRole('button', { name: 'Añadir varias' }));
    await user.type(screen.getByPlaceholderText(/Escribe una tarea por línea/), 'Algo');
    await user.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(screen.getByPlaceholderText(/Escribe una tarea por línea/)).toHaveValue('');

    await user.click(screen.getByRole('button', { name: 'Volver a una sola' }));
    expect(screen.getByPlaceholderText('Nueva tarea (paso pequeño)…')).toBeInTheDocument();
  });

  it('renders in the night theme', () => {
    renderQuickAdd({ isDay: false, subtleText: 'text-slate-300' });
    expect(screen.getByPlaceholderText('Nueva tarea (paso pequeño)…')).toBeInTheDocument();
  });
});
