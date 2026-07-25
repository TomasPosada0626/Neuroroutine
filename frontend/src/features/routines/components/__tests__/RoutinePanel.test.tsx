import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoutinePanel } from '../RoutinePanel';

vi.mock('@/shared/state/uiStore', () => ({
  useUiStore: (selector: (s: { theme: 'day' | 'night' }) => unknown) => selector({ theme: 'day' }),
}));

vi.mock('@/features/dashboard/store/dashboardPrefsStore', () => ({
  useDashboardPrefs: () => ({
    routineScheduleById: {},
    setRoutineSchedule: vi.fn(),
  }),
}));

vi.mock('@/features/auth/authStore', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

const routinesStoreState = {
  loading: false,
  error: null as string | null,
  offline: false,
  offlineSyncIssues: [] as { localId: string; title: string; message: string }[],
  selectedRoutineId: null as string | null,
  tasksByRoutineId: {} as Record<string, unknown[]>,
  selectRoutine: vi.fn(),
  editRoutine: vi.fn(),
  removeRoutine: vi.fn(),
  loadTasks: vi.fn(),
  addTask: vi.fn(),
  setTaskDone: vi.fn(),
  removeTask: vi.fn(),
  discardOfflineTask: vi.fn(),
};

vi.mock('@/features/routines/routinesStore', () => ({
  useRoutines: () => routinesStoreState,
}));

const listRoutinesMock = vi.fn();
const searchRoutinesMock = vi.fn();

vi.mock('@/features/routines/routinesService', () => ({
  listRoutines: (...args: unknown[]) => listRoutinesMock(...args),
  searchRoutines: (...args: unknown[]) => searchRoutinesMock(...args),
}));

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RoutinePanel />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  routinesStoreState.selectedRoutineId = null;
  routinesStoreState.error = null;
  routinesStoreState.offline = false;
  routinesStoreState.offlineSyncIssues = [];
  routinesStoreState.loading = false;
  routinesStoreState.tasksByRoutineId = {};
});

describe('RoutinePanel', () => {
  it('shows the empty state when the user has no routines yet', async () => {
    listRoutinesMock.mockResolvedValue([]);

    renderPanel();

    expect(await screen.findByText('Aún no tienes rutinas.')).toBeInTheDocument();
  });

  it('lists routines returned by listRoutines and lets the user pick one', async () => {
    listRoutinesMock.mockResolvedValue([
      { id: 'r1', user_id: 'u1', title: 'Mañana enfocada', notes: null },
      { id: 'r2', user_id: 'u1', title: 'Gym', notes: null },
    ]);

    const user = userEvent.setup();
    renderPanel();

    const routineButton = await screen.findByRole('button', { name: /Mañana enfocada/ });
    await user.click(routineButton);

    expect(routinesStoreState.selectRoutine).toHaveBeenCalledWith('r1');
  });

  it('debounces the search box and switches to searchRoutines results', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    listRoutinesMock.mockResolvedValue([
      { id: 'r1', user_id: 'u1', title: 'Mañana enfocada', notes: null },
    ]);
    searchRoutinesMock.mockResolvedValue([
      { id: 'r2', user_id: 'u1', title: 'Gym matches search', notes: null },
    ]);

    renderPanel();

    await screen.findByRole('button', { name: /Mañana enfocada/ });

    await user.type(screen.getByPlaceholderText('Buscar rutina…'), 'gym');

    // The search effect debounces for 250ms before it fires.
    expect(searchRoutinesMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => expect(searchRoutinesMock).toHaveBeenCalledWith('gym'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Gym matches search/ })).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: /Mañana enfocada/ })).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('shows the RPC search error message when the search query fails', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    listRoutinesMock.mockResolvedValue([]);
    searchRoutinesMock.mockRejectedValue(new Error('search backend down'));

    renderPanel();
    await screen.findByText('Aún no tienes rutinas.');

    await user.type(screen.getByPlaceholderText('Buscar rutina…'), 'gym');
    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => expect(screen.getByText('search backend down')).toBeInTheDocument());

    vi.useRealTimers();
  });

  it('marks a routine as favorite and persists the choice to localStorage', async () => {
    listRoutinesMock.mockResolvedValue([
      { id: 'r1', user_id: 'u1', title: 'Mañana enfocada', notes: null },
    ]);

    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('button', { name: /Mañana enfocada/ });
    await user.click(screen.getByRole('button', { name: 'Marcar como favorita' }));

    expect(screen.getByRole('button', { name: 'Quitar de favoritas' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('nr-fav-routines') ?? '[]')).toEqual(['r1']);
  });
});

describe('RoutinePanel with a selected routine', () => {
  beforeEach(() => {
    routinesStoreState.selectedRoutineId = 'r1';
    routinesStoreState.tasksByRoutineId = {
      r1: [
        {
          id: 't1',
          title: 'Tomar agua',
          is_done: false,
          description: null,
          due_date: null,
          due_time: null,
        },
        {
          id: 't2',
          title: 'Estirar',
          is_done: true,
          description: null,
          due_date: null,
          due_time: null,
        },
      ],
    };
    listRoutinesMock.mockResolvedValue([
      { id: 'r1', user_id: 'u1', title: 'Mañana enfocada', notes: 'Rutina de prueba' },
    ]);
  });

  it('renders the selected routine, its tasks, and lets the user complete one', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    expect(screen.getByText('Tomar agua')).toBeInTheDocument();
    expect(screen.getByText('Estirar')).toBeInTheDocument();

    const pendingCheckbox = screen.getByRole('checkbox', { name: /Tomar agua/ });
    await user.click(pendingCheckbox);

    expect(routinesStoreState.setTaskDone).toHaveBeenCalledWith({
      id: 't1',
      routine_id: 'r1',
      is_done: true,
    });
  });

  it('adds a single task through the quick-add input', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });

    await user.type(screen.getByPlaceholderText('Nueva tarea (paso pequeño)…'), 'Leer 10 min');
    await user.click(screen.getByRole('button', { name: 'Añadir' }));

    expect(routinesStoreState.addTask).toHaveBeenCalledWith({
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Leer 10 min',
    });
  });

  it('switches to bulk mode and creates one task per non-empty line', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.click(screen.getByRole('button', { name: 'Añadir varias' }));

    await user.type(
      screen.getByPlaceholderText(/Escribe una tarea por línea/),
      'Tarea A\nTarea B\n\n',
    );
    await user.click(screen.getByRole('button', { name: 'Añadir tareas' }));

    await waitFor(() => expect(routinesStoreState.addTask).toHaveBeenCalledTimes(2));
    expect(routinesStoreState.addTask).toHaveBeenNthCalledWith(1, {
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Tarea A',
    });
    expect(routinesStoreState.addTask).toHaveBeenNthCalledWith(2, {
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Tarea B',
    });
  });

  it('deletes a task after the user confirms', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    const deleteButtons = screen.getAllByRole('button', { name: 'Quitar' });
    await user.click(deleteButtons[0]!);

    expect(routinesStoreState.removeTask).toHaveBeenCalledWith({ id: 't1', routine_id: 'r1' });
  });

  it('does not delete a task when the user cancels the confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.click(screen.getAllByRole('button', { name: 'Quitar' })[0]!);

    expect(routinesStoreState.removeTask).not.toHaveBeenCalled();
  });

  it('deletes the routine after confirmation and clears the selection', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    routinesStoreState.removeRoutine.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(routinesStoreState.removeRoutine).toHaveBeenCalledWith('r1'));
    expect(routinesStoreState.selectRoutine).toHaveBeenCalledWith(null);
  });

  it('disables destructive actions while offline', async () => {
    routinesStoreState.offline = true;
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    expect(screen.getByRole('button', { name: 'Editar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled();
  });

  it('opens and closes the schedule editor for the selected routine', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });

    await user.click(screen.getByRole('button', { name: 'Editar programación' }));
    expect(screen.getByText('Días')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ocultar programación' }));
    expect(screen.queryByText('Días')).not.toBeInTheDocument();
  });

  it('shows a stuck offline task with its failure reason and lets the user discard it', async () => {
    routinesStoreState.offlineSyncIssues = [
      { localId: 't1', title: 'Tomar agua', message: 'La rutina de esta tarea ya no existe.' },
    ];
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    expect(
      screen.getByText('No se pudo sincronizar: La rutina de esta tarea ya no existe.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Tomar agua/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Descartar' }));

    expect(routinesStoreState.discardOfflineTask).toHaveBeenCalledWith('t1');
  });
});

describe('RoutinePanel collapsed state', () => {
  it('starts collapsed when the preference was saved, and can be reopened', async () => {
    localStorage.setItem('nr-routine-panel-collapsed', '1');
    listRoutinesMock.mockResolvedValue([]);

    const user = userEvent.setup();
    renderPanel();

    expect(
      screen.getByText('Panel minimizado. Vuelve a abrirlo cuando lo necesites.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abrir panel' }));

    expect(localStorage.getItem('nr-routine-panel-collapsed')).toBe('0');
  });
});
