import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReminderPreferencesPanel } from '../ReminderPreferencesPanel';

let authUser: { id: string } | null = { id: 'u1' };
vi.mock('@/features/auth/authStore', () => ({
  useAuth: () => ({ user: authUser }),
}));

const getReminderPreferencesMock = vi.fn();
const upsertReminderPreferencesMock = vi.fn();
vi.mock('@/features/reminders/reminderPreferencesService', () => ({
  getReminderPreferences: (...args: unknown[]) => getReminderPreferencesMock(...args),
  upsertReminderPreferences: (...args: unknown[]) => upsertReminderPreferencesMock(...args),
}));

function renderPanel(isDay = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReminderPreferencesPanel isDay={isDay} subtleText="text-slate-500" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  authUser = { id: 'u1' };
});

describe('ReminderPreferencesPanel', () => {
  it('pre-fills from the existing backend row', async () => {
    getReminderPreferencesMock.mockResolvedValue({
      user_id: 'u1',
      email_enabled: false,
      reminder_hour: 20,
      timezone: 'UTC',
      updated_at: '2026-07-01T00:00:00.000Z',
    });

    renderPanel();

    const checkbox = await screen.findByRole('checkbox', {
      name: 'Recibir recordatorios por email',
    });
    expect(checkbox).not.toBeChecked();
    expect(screen.getByLabelText('Hora del recordatorio por email')).toHaveValue(20);
  });

  it('defaults to enabled with no saved row yet, and saves a new preference', async () => {
    const user = userEvent.setup();
    getReminderPreferencesMock.mockResolvedValue(null);
    upsertReminderPreferencesMock.mockResolvedValue({
      user_id: 'u1',
      email_enabled: true,
      reminder_hour: 9,
      timezone: 'UTC',
      updated_at: '2026-07-01T00:00:00.000Z',
    });

    renderPanel();

    await screen.findByRole('checkbox', { name: 'Recibir recordatorios por email' });
    const hourInput = screen.getByLabelText('Hora del recordatorio por email');
    await user.clear(hourInput);
    await user.type(hourInput, '9');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(upsertReminderPreferencesMock).toHaveBeenCalledWith({
        user_id: 'u1',
        email_enabled: true,
        reminder_hour: 9,
      }),
    );
    expect(await screen.findByText('Guardado')).toBeInTheDocument();
  });

  it('disables the hour input while email reminders are off', async () => {
    const user = userEvent.setup();
    getReminderPreferencesMock.mockResolvedValue({
      user_id: 'u1',
      email_enabled: true,
      reminder_hour: 8,
      timezone: 'UTC',
      updated_at: '2026-07-01T00:00:00.000Z',
    });

    renderPanel();

    const checkbox = await screen.findByRole('checkbox', {
      name: 'Recibir recordatorios por email',
    });
    await user.click(checkbox);

    expect(screen.getByLabelText('Hora del recordatorio por email')).toBeDisabled();
  });

  it('shows an error message when saving fails', async () => {
    const user = userEvent.setup();
    getReminderPreferencesMock.mockResolvedValue({
      user_id: 'u1',
      email_enabled: true,
      reminder_hour: 8,
      timezone: 'UTC',
      updated_at: '2026-07-01T00:00:00.000Z',
    });
    upsertReminderPreferencesMock.mockRejectedValue(new Error('RLS denied'));

    renderPanel();

    await screen.findByRole('checkbox', { name: 'Recibir recordatorios por email' });
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('No se pudo guardar. Intenta de nuevo.')).toBeInTheDocument();
  });

  it('clears the hour draft when the input is emptied', async () => {
    getReminderPreferencesMock.mockResolvedValue({
      user_id: 'u1',
      email_enabled: true,
      reminder_hour: 8,
      timezone: 'UTC',
      updated_at: '2026-07-01T00:00:00.000Z',
    });

    renderPanel();

    const hourInput = await screen.findByLabelText('Hora del recordatorio por email');
    fireEvent.change(hourInput, { target: { value: '' } });

    expect(hourInput).toHaveValue(null);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('shows the "Guardado" confirmation in the night theme too', async () => {
    const user = userEvent.setup();
    getReminderPreferencesMock.mockResolvedValue({
      user_id: 'u1',
      email_enabled: true,
      reminder_hour: 8,
      timezone: 'UTC',
      updated_at: '2026-07-01T00:00:00.000Z',
    });
    upsertReminderPreferencesMock.mockResolvedValue({
      user_id: 'u1',
      email_enabled: true,
      reminder_hour: 8,
      timezone: 'UTC',
      updated_at: '2026-07-01T00:00:00.000Z',
    });

    renderPanel(false);

    await screen.findByRole('checkbox', { name: 'Recibir recordatorios por email' });
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Guardado')).toBeInTheDocument();
  });

  it('hides the "Guardado" confirmation again after the timeout elapses', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    getReminderPreferencesMock.mockResolvedValue({
      user_id: 'u1',
      email_enabled: true,
      reminder_hour: 8,
      timezone: 'UTC',
      updated_at: '2026-07-01T00:00:00.000Z',
    });
    upsertReminderPreferencesMock.mockResolvedValue({
      user_id: 'u1',
      email_enabled: true,
      reminder_hour: 8,
      timezone: 'UTC',
      updated_at: '2026-07-01T00:00:00.000Z',
    });

    renderPanel();

    await screen.findByRole('checkbox', { name: 'Recibir recordatorios por email' });
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(screen.getByText('Guardado')).toBeInTheDocument());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });

    expect(screen.queryByText('Guardado')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('renders nothing (no fetch) when there is no logged-in user', () => {
    authUser = null;
    renderPanel();

    expect(getReminderPreferencesMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
