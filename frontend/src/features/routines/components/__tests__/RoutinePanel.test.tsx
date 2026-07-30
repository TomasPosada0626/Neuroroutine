import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoutinePanel } from '../RoutinePanel';
import type { RoutineSchedule } from '@/shared/state/dashboardPrefsStore';

const uiState = vi.hoisted(() => ({ theme: 'day' as 'day' | 'night' }));
vi.mock('@/shared/state/uiStore', () => ({
  useUiStore: (selector: (s: { theme: 'day' | 'night' }) => unknown) =>
    selector({ theme: uiState.theme }),
}));

const dashboardPrefsState: {
  routineScheduleById: Record<string, RoutineSchedule>;
  setRoutineSchedule: ReturnType<typeof vi.fn>;
  favoriteRoutineIds: string[];
  toggleFavoriteRoutine: ReturnType<typeof vi.fn>;
  routinePanelCollapsed: boolean;
  setRoutinePanelCollapsed: ReturnType<typeof vi.fn>;
} = {
  routineScheduleById: {},
  setRoutineSchedule: vi.fn((id: string, sched: RoutineSchedule) => {
    dashboardPrefsState.routineScheduleById = {
      ...dashboardPrefsState.routineScheduleById,
      [id]: sched,
    };
  }),
  favoriteRoutineIds: [],
  toggleFavoriteRoutine: vi.fn((id: string) => {
    dashboardPrefsState.favoriteRoutineIds = dashboardPrefsState.favoriteRoutineIds.includes(id)
      ? dashboardPrefsState.favoriteRoutineIds.filter((x) => x !== id)
      : [...dashboardPrefsState.favoriteRoutineIds, id];
  }),
  routinePanelCollapsed: false,
  setRoutinePanelCollapsed: vi.fn((next: boolean) => {
    dashboardPrefsState.routinePanelCollapsed = next;
  }),
};

vi.mock('@/shared/state/dashboardPrefsStore', () => ({
  useDashboardPrefs: () => dashboardPrefsState,
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
  editTask: vi.fn(),
  postponeTask: vi.fn(),
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
  uiState.theme = 'day';
  dashboardPrefsState.routineScheduleById = {};
  dashboardPrefsState.favoriteRoutineIds = [];
  dashboardPrefsState.routinePanelCollapsed = false;
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

  it('marks a routine as favorite via the shared dashboard prefs store', async () => {
    listRoutinesMock.mockResolvedValue([
      { id: 'r1', user_id: 'u1', title: 'Mañana enfocada', notes: null },
    ]);

    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('button', { name: /Mañana enfocada/ });
    await user.click(screen.getByRole('button', { name: 'Marcar como favorita' }));

    expect(dashboardPrefsState.toggleFavoriteRoutine).toHaveBeenCalledWith('r1');
    expect(dashboardPrefsState.favoriteRoutineIds).toEqual(['r1']);
  });

  it('shows a routine already in favoriteRoutineIds as favorited, and unmarks it on click', async () => {
    dashboardPrefsState.favoriteRoutineIds = ['r1'];
    listRoutinesMock.mockResolvedValue([
      { id: 'r1', user_id: 'u1', title: 'Mañana enfocada', notes: null },
    ]);

    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('button', { name: 'Quitar de favoritas' });
    await user.click(screen.getByRole('button', { name: 'Quitar de favoritas' }));

    expect(dashboardPrefsState.toggleFavoriteRoutine).toHaveBeenCalledWith('r1');
    expect(dashboardPrefsState.favoriteRoutineIds).toEqual([]);
  });

  it('clears a stale selection once the settled routine list no longer contains it', async () => {
    routinesStoreState.selectedRoutineId = 'gone';
    listRoutinesMock.mockResolvedValue([
      { id: 'r1', user_id: 'u1', title: 'Mañana enfocada', notes: null },
    ]);

    renderPanel();

    await waitFor(() => expect(routinesStoreState.selectRoutine).toHaveBeenCalledWith(null));
  });

  it('renders with night-theme styling without crashing', async () => {
    uiState.theme = 'night';
    listRoutinesMock.mockResolvedValue([
      { id: 'r1', user_id: 'u1', title: 'Mañana enfocada', notes: null },
    ]);

    renderPanel();

    expect(await screen.findByRole('button', { name: /Mañana enfocada/ })).toBeInTheDocument();
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
      due_date: null,
      is_recurring: false,
    });
  });

  it('sets due_date to today or tomorrow via the quick-capture chips', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });

    await user.type(screen.getByPlaceholderText('Nueva tarea (paso pequeño)…'), 'Llamar al médico');
    await user.click(screen.getByRole('button', { name: 'Mañana' }));
    await user.click(screen.getByRole('button', { name: 'Añadir' }));

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = [
      tomorrow.getFullYear(),
      String(tomorrow.getMonth() + 1).padStart(2, '0'),
      String(tomorrow.getDate()).padStart(2, '0'),
    ].join('-');

    expect(routinesStoreState.addTask).toHaveBeenCalledWith({
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Llamar al médico',
      due_date: tomorrowKey,
      is_recurring: false,
    });
  });

  it('checking "Repetir cada día" clears a previously picked quick-capture date', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });

    await user.click(screen.getByRole('button', { name: 'Hoy' }));
    await user.click(screen.getByRole('checkbox', { name: 'Repetir cada día (hábito)' }));

    const dateInput = screen.getByLabelText('Elegir fecha para la tarea') as HTMLInputElement;
    expect(dateInput.value).toBe('');
    expect(dateInput).toBeDisabled();
  });

  it('marks a quick-add task as recurring when "Repetir cada día" is checked', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });

    await user.type(screen.getByPlaceholderText('Nueva tarea (paso pequeño)…'), 'Tomar agua');
    await user.click(screen.getByRole('checkbox', { name: 'Repetir cada día (hábito)' }));
    await user.click(screen.getByRole('button', { name: 'Añadir' }));

    expect(routinesStoreState.addTask).toHaveBeenCalledWith({
      user_id: 'u1',
      routine_id: 'r1',
      title: 'Tomar agua',
      due_date: null,
      is_recurring: true,
    });
    // The toggle resets after a successful add, same as the title field.
    expect(screen.getByRole('checkbox', { name: 'Repetir cada día (hábito)' })).not.toBeChecked();
  });

  it('shows a "Diario" badge on recurring tasks', async () => {
    routinesStoreState.tasksByRoutineId = {
      r1: [
        {
          id: 't1',
          title: 'Tomar agua',
          is_done: false,
          is_recurring: true,
          description: null,
          due_date: null,
          due_time: null,
        },
      ],
    };
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    expect(screen.getByText('Diario')).toBeInTheDocument();
  });

  it('shows an abbreviated weekday badge for a task recurring on specific days', async () => {
    routinesStoreState.tasksByRoutineId = {
      r1: [
        {
          id: 't1',
          title: 'Gym',
          is_done: false,
          is_recurring: true,
          recurrence_days_of_week: [1, 3, 5],
          description: null,
          due_date: null,
          due_time: null,
        },
      ],
    };
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    expect(screen.getByText('L X V')).toBeInTheDocument();
    expect(screen.queryByText('Diario')).not.toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: 'Quitar tarea: Tomar agua' }));

    expect(routinesStoreState.removeTask).toHaveBeenCalledWith({ id: 't1', routine_id: 'r1' });
  });

  it('does not delete a task when the user cancels the confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.click(screen.getByRole('button', { name: 'Quitar tarea: Tomar agua' }));

    expect(routinesStoreState.removeTask).not.toHaveBeenCalled();
  });

  it('opens the edit modal pre-filled and saves changes through editTask', async () => {
    const user = userEvent.setup();
    routinesStoreState.editTask.mockResolvedValue(undefined);
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.click(screen.getByRole('button', { name: 'Editar tarea: Tomar agua' }));

    const titleInput = screen.getByLabelText('Título') as HTMLInputElement;
    expect(titleInput.value).toBe('Tomar agua');

    await user.clear(titleInput);
    await user.type(titleInput, 'Tomar 2L de agua');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(routinesStoreState.editTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1', routine_id: 'r1', title: 'Tomar 2L de agua' }),
    );
  });

  it('postpones a pending one-off task to tomorrow', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.click(screen.getByRole('button', { name: 'Posponer' }));

    expect(routinesStoreState.postponeTask).toHaveBeenCalledWith({
      id: 't1',
      routine_id: 'r1',
    });
  });

  it('does not offer "Posponer" for a completed or a recurring task', async () => {
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    // t2 ("Estirar") is already done in the shared fixture, so only t1 can show "Posponer".
    expect(screen.getAllByRole('button', { name: 'Posponer' })).toHaveLength(1);
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

  it('shows the default "no schedule" summary when nothing is configured', async () => {
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    expect(screen.getByText('Sin programación')).toBeInTheDocument();
  });

  it('formats a schedule summary with days and an hour', async () => {
    dashboardPrefsState.routineScheduleById = { r1: { daysOfWeek: [3, 1, 5], hour: 7 } };
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    // Sorted ascending: 1=L(Mon), 3=X(Wed), 5=V(Fri).
    expect(screen.getByText('L X V · 07:00')).toBeInTheDocument();
  });

  it('formats a schedule summary with an hour but no days as "Sin días"', async () => {
    dashboardPrefsState.routineScheduleById = { r1: { daysOfWeek: [], hour: 20 } };
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    expect(screen.getByText('Sin días · 20:00')).toBeInTheDocument();
  });

  it('adds a day to an empty schedule when toggled on', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.click(screen.getByRole('button', { name: 'Editar programación' }));

    await user.click(screen.getByRole('button', { name: 'L' }));
    expect(dashboardPrefsState.setRoutineSchedule).toHaveBeenLastCalledWith('r1', {
      daysOfWeek: [1],
      hour: null,
    });
  });

  it('adds a day to a schedule that already has other days set', async () => {
    dashboardPrefsState.routineScheduleById = { r1: { daysOfWeek: [1, 5], hour: null } };
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.click(screen.getByRole('button', { name: 'Editar programación' }));

    await user.click(screen.getByRole('button', { name: 'M' }));
    expect(dashboardPrefsState.setRoutineSchedule).toHaveBeenLastCalledWith('r1', {
      daysOfWeek: [1, 2, 5],
      hour: null,
    });
  });

  it('renders the day pills in night theme', async () => {
    uiState.theme = 'night';
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.click(screen.getByRole('button', { name: 'Editar programación' }));

    expect(screen.getByRole('button', { name: 'L' })).toBeInTheDocument();
  });

  it('removes an already-active day when toggled off', async () => {
    dashboardPrefsState.routineScheduleById = { r1: { daysOfWeek: [1], hour: null } };
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.click(screen.getByRole('button', { name: 'Editar programación' }));

    await user.click(screen.getByRole('button', { name: 'L' }));
    expect(dashboardPrefsState.setRoutineSchedule).toHaveBeenLastCalledWith('r1', {
      daysOfWeek: [],
      hour: null,
    });
  });

  it('clamps an out-of-range schedule hour to the valid 0-23 range', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.click(screen.getByRole('button', { name: 'Editar programación' }));

    const hourInput = screen.getByPlaceholderText('0-23');
    fireEvent.change(hourInput, { target: { value: '99' } });

    expect(dashboardPrefsState.setRoutineSchedule).toHaveBeenLastCalledWith('r1', {
      daysOfWeek: [],
      hour: 23,
    });
  });

  it('clears the schedule hour when the input is emptied', async () => {
    dashboardPrefsState.routineScheduleById = { r1: { daysOfWeek: [], hour: 9 } };
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.click(screen.getByRole('button', { name: 'Editar programación' }));

    const hourInput = screen.getByPlaceholderText('0-23');
    fireEvent.change(hourInput, { target: { value: '' } });

    expect(dashboardPrefsState.setRoutineSchedule).toHaveBeenLastCalledWith('r1', {
      daysOfWeek: [],
      hour: null,
    });
  });

  it('clears the hour via "Limpiar" while preserving the configured days', async () => {
    dashboardPrefsState.routineScheduleById = { r1: { daysOfWeek: [2, 4], hour: 15 } };
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.click(screen.getByRole('button', { name: 'Editar programación' }));
    await user.click(screen.getByRole('button', { name: 'Limpiar' }));

    expect(dashboardPrefsState.setRoutineSchedule).toHaveBeenLastCalledWith('r1', {
      daysOfWeek: [2, 4],
      hour: null,
    });
  });

  it('refreshes routines via the Refrescar button', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.click(screen.getByRole('button', { name: 'Refrescar' }));

    expect(listRoutinesMock).toHaveBeenCalled();
  });

  it('also refreshes the search results when a search query is active', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    searchRoutinesMock.mockResolvedValue([
      { id: 'r2', user_id: 'u1', title: 'Gym matches search', notes: null },
    ]);

    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.type(screen.getByPlaceholderText('Buscar rutina…'), 'gym');
    await vi.advanceTimersByTimeAsync(300);
    await waitFor(() => expect(searchRoutinesMock).toHaveBeenCalledWith('gym'));

    searchRoutinesMock.mockClear();
    await user.click(screen.getByRole('button', { name: 'Refrescar' }));

    await waitFor(() => expect(searchRoutinesMock).toHaveBeenCalledWith('gym'));

    vi.useRealTimers();
  });

  it('opens the edit routine modal pre-filled and saves changes', async () => {
    const user = userEvent.setup();
    routinesStoreState.editRoutine.mockResolvedValue(undefined);
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.click(screen.getByRole('button', { name: 'Editar' }));

    const titleInput = screen.getByPlaceholderText('Ej: Mañana enfocada') as HTMLInputElement;
    expect(titleInput.value).toBe('Mañana enfocada');

    await user.clear(titleInput);
    await user.type(titleInput, 'Mañana enfocada v2');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(routinesStoreState.editRoutine).toHaveBeenCalledWith({
        id: 'r1',
        title: 'Mañana enfocada v2',
        notes: 'Rutina de prueba',
      }),
    );
  });

  it('saves null notes when the edited routine notes are cleared', async () => {
    const user = userEvent.setup();
    routinesStoreState.editRoutine.mockResolvedValue(undefined);
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.click(screen.getByRole('button', { name: 'Editar' }));

    const notesInput = screen.getByPlaceholderText('Pequeñas reglas, intención, recordatorios…');
    await user.clear(notesInput);
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(routinesStoreState.editRoutine).toHaveBeenCalledWith(
        expect.objectContaining({ notes: null }),
      ),
    );
  });

  it('clears bulk text with the "Limpiar" button', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.click(screen.getByRole('button', { name: 'Añadir varias' }));

    const textarea = screen.getByPlaceholderText(/Escribe una tarea por línea/);
    await user.type(textarea, 'Algo');
    await user.click(screen.getByRole('button', { name: 'Limpiar' }));

    expect(textarea).toHaveValue('');
  });

  it('toggles the "Hoy" quick-capture chip off on a second click', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.click(screen.getByRole('button', { name: 'Hoy' }));

    const dateInput = screen.getByLabelText('Elegir fecha para la tarea') as HTMLInputElement;
    expect(dateInput.value).not.toBe('');

    await user.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(dateInput.value).toBe('');
  });

  it('accepts a manually picked date from the date input', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.type(
      screen.getByPlaceholderText('Nueva tarea (paso pequeño)…'),
      'Cita con el dentista',
    );

    const dateInput = screen.getByLabelText('Elegir fecha para la tarea');
    fireEvent.change(dateInput, { target: { value: '2026-08-01' } });
    await user.click(screen.getByRole('button', { name: 'Añadir' }));

    expect(routinesStoreState.addTask).toHaveBeenCalledWith(
      expect.objectContaining({ due_date: '2026-08-01' }),
    );
  });

  it('saves description, due date, and due time when editing a task with all fields filled', async () => {
    const user = userEvent.setup();
    routinesStoreState.editTask.mockResolvedValue(undefined);
    renderPanel();

    await screen.findByRole('heading', { name: 'Mañana enfocada' });
    await user.click(screen.getByRole('button', { name: 'Editar tarea: Tomar agua' }));

    await user.type(screen.getByLabelText('Descripción (opcional)'), 'Vaso grande');
    fireEvent.change(screen.getByLabelText('Fecha (opcional)'), {
      target: { value: '2026-08-01' },
    });
    fireEvent.change(screen.getByLabelText('Hora (opcional)'), { target: { value: '07:30' } });
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(routinesStoreState.editTask).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Vaso grande',
          due_date: '2026-08-01',
          due_time: '07:30',
        }),
      ),
    );
  });
});

describe('RoutinePanel collapsed state', () => {
  it('starts collapsed when the preference was saved, and can be reopened', async () => {
    dashboardPrefsState.routinePanelCollapsed = true;
    listRoutinesMock.mockResolvedValue([]);

    const user = userEvent.setup();
    renderPanel();

    expect(
      screen.getByText('Panel minimizado. Vuelve a abrirlo cuando lo necesites.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abrir panel' }));

    expect(dashboardPrefsState.setRoutinePanelCollapsed).toHaveBeenCalledWith(false);
  });
});
