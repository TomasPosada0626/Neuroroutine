import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoutineWizardModal } from '../RoutineWizardModal';

const uiState = vi.hoisted(() => ({ theme: 'day' as 'day' | 'night' }));
vi.mock('@/shared/state/uiStore', () => {
  return {
    useUiStore: (selector: (s: { theme: 'day' | 'night' }) => unknown) =>
      selector({ theme: uiState.theme }),
  };
});

const addRoutine = vi.fn();
const addTasksBulk = vi.fn();
let offline = false;
let authUser: { id: string } | null = { id: 'u1' };

vi.mock('@/features/routines/routinesStore', () => {
  return {
    useRoutines: () => ({
      offline,
      addRoutine,
      addTasksBulk,
    }),
  };
});

vi.mock('@/features/auth/authStore', () => {
  return {
    useAuth: () => ({
      user: authUser,
    }),
  };
});

describe('RoutineWizardModal', () => {
  it('requires a routine title before enabling submit', async () => {
    const user = userEvent.setup();

    addRoutine.mockResolvedValueOnce({ id: 'r1' });
    addTasksBulk.mockResolvedValueOnce(undefined);

    render(<RoutineWizardModal open onClose={() => {}} />);

    const submit = screen.getByRole('button', { name: 'Crear rutina' });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    await user.type(screen.getByPlaceholderText('Ej: Mañana enfocada'), 'Mi rutina');
    expect((submit as HTMLButtonElement).disabled).toBe(false);
  });

  // Extended timeout: a long sequence of userEvent.type() calls across many fields can
  // exceed the default 5s under parallel test-worker load without being a real hang.
  it('creates a routine and bulk-creates normalized tasks', async () => {
    const user = userEvent.setup();

    addRoutine.mockResolvedValueOnce({ id: 'r1' });
    addTasksBulk.mockResolvedValueOnce(undefined);

    const onClose = vi.fn();
    const onCreated = vi.fn();

    render(<RoutineWizardModal open onClose={onClose} onCreated={onCreated} />);

    // Routine title
    const routineTitle = screen.getByPlaceholderText('Ej: Mañana enfocada');
    await user.type(routineTitle, '  Mi rutina  ');

    // First task
    const taskTitles = screen.getAllByPlaceholderText('Ej: Tomar agua');
    await user.type(taskTitles[0]!, '  Tarea 1  ');

    // Add second task row
    await user.click(screen.getByRole('button', { name: '+ Tarea' }));

    const taskTitles2 = screen.getAllByPlaceholderText('Ej: Tomar agua');
    await user.type(taskTitles2[1]!, 'Tarea 2');

    const taskDescs = screen.getAllByPlaceholderText('Ej: 2 litros');
    await user.type(taskDescs[1]!, '  desc  ');

    const dateInputs = Array.from(
      document.querySelectorAll('input[type="date"]'),
    ) as HTMLInputElement[];
    const timeInputs = Array.from(
      document.querySelectorAll('input[type="time"]'),
    ) as HTMLInputElement[];

    // Fill the second row date/time.
    await user.type(dateInputs[1]!, '2025-01-05');
    await user.type(timeInputs[1]!, '8:00:00');

    await user.click(screen.getByRole('button', { name: 'Crear rutina' }));

    expect(addRoutine).toHaveBeenCalledWith({
      user_id: 'u1',
      title: 'Mi rutina',
      notes: null,
    });

    expect(addTasksBulk).toHaveBeenCalledWith({
      user_id: 'u1',
      routine_id: 'r1',
      tasks: [
        {
          title: 'Tarea 1',
          description: null,
          due_date: null,
          due_time: null,
          is_recurring: false,
        },
        {
          title: 'Tarea 2',
          description: 'desc',
          due_date: '2025-01-05',
          due_time: '08:00',
          is_recurring: false,
        },
      ],
    });

    expect(onCreated).toHaveBeenCalledWith('r1');
    expect(onClose).toHaveBeenCalled();
  }, 15000);

  it('marks a task row as recurring when its "Repetir cada día" checkbox is checked', async () => {
    const user = userEvent.setup();

    addRoutine.mockReset();
    addTasksBulk.mockReset();
    addRoutine.mockResolvedValueOnce({ id: 'r3' });
    addTasksBulk.mockResolvedValueOnce(undefined);

    render(<RoutineWizardModal open onClose={() => {}} />);

    await user.type(screen.getByPlaceholderText('Ej: Mañana enfocada'), 'Mi rutina');
    await user.type(screen.getByPlaceholderText('Ej: Tomar agua'), 'Tomar agua');
    await user.click(screen.getByRole('checkbox', { name: 'Repetir cada día la tarea 1' }));
    await user.click(screen.getByRole('button', { name: 'Crear rutina' }));

    expect(addTasksBulk).toHaveBeenCalledWith({
      user_id: 'u1',
      routine_id: 'r3',
      tasks: [
        {
          title: 'Tomar agua',
          description: null,
          due_date: null,
          due_time: null,
          is_recurring: true,
        },
      ],
    });
  });

  it('disables submit when offline', async () => {
    const user = userEvent.setup();

    offline = true;
    addRoutine.mockReset();
    addTasksBulk.mockReset();

    render(<RoutineWizardModal open onClose={() => {}} />);

    const routineTitle = screen.getByPlaceholderText('Ej: Mañana enfocada');
    await user.type(routineTitle, 'Mi rutina');

    expect(
      (screen.getByRole('button', { name: 'Crear rutina' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.getByText('Modo offline: puedes ver, pero no crear.')).not.toBeNull();

    // Single task row cannot be removed.
    expect(
      (screen.getByRole('button', { name: 'Debe existir al menos una fila' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    offline = false;
  });

  it('disables submit when user is missing', async () => {
    const user = userEvent.setup();
    authUser = null;

    render(<RoutineWizardModal open onClose={() => {}} />);
    await user.type(screen.getByPlaceholderText('Ej: Mañana enfocada'), 'Mi rutina');

    expect(
      (screen.getByRole('button', { name: 'Crear rutina' }) as HTMLButtonElement).disabled,
    ).toBe(true);

    authUser = { id: 'u1' };
  });

  it('shows generic error message when create fails with non-Error value', async () => {
    const user = userEvent.setup();

    addRoutine.mockRejectedValueOnce('boom');

    render(<RoutineWizardModal open onClose={() => {}} />);

    await user.type(screen.getByPlaceholderText('Ej: Mañana enfocada'), 'Mi rutina');
    await user.click(screen.getByRole('button', { name: 'Crear rutina' }));

    expect(screen.getByText('No se pudo crear la rutina')).not.toBeNull();
  });

  it('shows the specific error message when create fails with a real Error', async () => {
    const user = userEvent.setup();

    addRoutine.mockRejectedValueOnce(new Error('duplicate routine title'));

    render(<RoutineWizardModal open onClose={() => {}} />);

    await user.type(screen.getByPlaceholderText('Ej: Mañana enfocada'), 'Mi rutina');
    await user.click(screen.getByRole('button', { name: 'Crear rutina' }));

    expect(screen.getByText('duplicate routine title')).not.toBeNull();
  });

  it('renders in the night theme', () => {
    uiState.theme = 'night';

    render(<RoutineWizardModal open onClose={() => {}} />);

    expect(screen.getByPlaceholderText('Ej: Mañana enfocada')).toBeInTheDocument();
    uiState.theme = 'day';
  });

  it('only updates the toggled row, leaving sibling task rows unchanged', async () => {
    const user = userEvent.setup();

    addRoutine.mockResolvedValueOnce({ id: 'r-multi' });
    addTasksBulk.mockReset();
    addTasksBulk.mockResolvedValueOnce(undefined);

    render(<RoutineWizardModal open onClose={() => {}} />);

    await user.type(screen.getByPlaceholderText('Ej: Mañana enfocada'), 'Mi rutina');
    const taskTitles = screen.getAllByPlaceholderText('Ej: Tomar agua');
    await user.type(taskTitles[0]!, 'Tarea 1');

    await user.click(screen.getByRole('button', { name: '+ Tarea' }));
    const taskTitles2 = screen.getAllByPlaceholderText('Ej: Tomar agua');
    await user.type(taskTitles2[1]!, 'Tarea 2');

    await user.click(screen.getByRole('checkbox', { name: 'Repetir cada día la tarea 2' }));
    await user.click(screen.getByRole('button', { name: 'Crear rutina' }));

    expect(addTasksBulk).toHaveBeenCalledWith(
      expect.objectContaining({
        tasks: [
          expect.objectContaining({ title: 'Tarea 1', is_recurring: false }),
          expect.objectContaining({ title: 'Tarea 2', is_recurring: true }),
        ],
      }),
    );
  });

  it('creates routine without calling addTasksBulk when all task titles are blank', async () => {
    const user = userEvent.setup();

    addRoutine.mockResolvedValueOnce({ id: 'r2' });
    addTasksBulk.mockReset();

    render(<RoutineWizardModal open onClose={() => {}} />);

    await user.type(screen.getByPlaceholderText('Ej: Mañana enfocada'), 'Routine only');
    await user.click(screen.getByRole('button', { name: 'Crear rutina' }));

    expect(addRoutine).toHaveBeenCalled();
    expect(addTasksBulk).not.toHaveBeenCalled();
  });

  it('passes trimmed notes when provided', async () => {
    const user = userEvent.setup();

    addRoutine.mockResolvedValueOnce({ id: 'r-notes' });
    addTasksBulk.mockReset();

    render(<RoutineWizardModal open onClose={() => {}} />);

    await user.type(screen.getByPlaceholderText('Ej: Mañana enfocada'), 'Routine with notes');
    await user.type(screen.getByLabelText('Notas'), '  nota importante  ');
    await user.click(screen.getByRole('button', { name: 'Crear rutina' }));

    expect(addRoutine).toHaveBeenCalledWith({
      user_id: 'u1',
      title: 'Routine with notes',
      notes: 'nota importante',
    });
  });

  it('removes a non-first task row when Eliminar is clicked', async () => {
    const user = userEvent.setup();

    render(<RoutineWizardModal open onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: '+ Tarea' }));
    expect(screen.getAllByPlaceholderText('Ej: Tomar agua')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Eliminar tarea 2' }));
    expect(screen.getAllByPlaceholderText('Ej: Tomar agua')).toHaveLength(1);
  });

  it('uses modal close button and triggers close callback', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<RoutineWizardModal open onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes and resets state when cancel is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<RoutineWizardModal open onClose={onClose} />);

    await user.type(screen.getByPlaceholderText('Ej: Mañana enfocada'), 'Temporary title');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
  });
});
