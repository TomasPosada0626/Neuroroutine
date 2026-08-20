import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InsightsWidget } from '../InsightsWidget';
import type { SelectedRoutineAnalytics } from '@/features/dashboard/utils/dashboardAnalytics';

const onScheduleReminderAtHourMock = vi.fn();

const weekCounts = {
  startThis: new Date(),
  startPrev: new Date(),
  thisWeekCompleted: 3,
  prevWeekCompleted: 1,
  deltaPct: 200,
  consistencyThis: 40,
  consistencyPrev: 20,
};

function analytics(overrides: Partial<SelectedRoutineAnalytics> = {}): SelectedRoutineAnalytics {
  return {
    bestWindowStart: 9,
    source: 'events',
    ...overrides,
  } as unknown as SelectedRoutineAnalytics;
}

function renderWidget(props: Partial<React.ComponentProps<typeof InsightsWidget>> = {}) {
  return render(
    <InsightsWidget
      userId="u1"
      weekCounts={weekCounts}
      selectedRoutineAnalytics={analytics()}
      struggleTasks={[]}
      isDay
      subtleText="text-slate-600"
      panelText="text-slate-700"
      collapsed={false}
      onToggleCollapsed={() => {}}
      onScheduleReminderAtHour={onScheduleReminderAtHourMock}
      {...props}
    />,
  );
}

describe('InsightsWidget', () => {
  beforeEach(() => {
    onScheduleReminderAtHourMock.mockReset();
  });

  it('shows the weekly comparison and best window', () => {
    renderWidget();

    expect(screen.getByText(/3 completadas esta semana/)).toBeInTheDocument();
    expect(screen.getByText(/09:00/)).toBeInTheDocument();
  });

  it('prompts to activate real history when there is no event source', () => {
    renderWidget({ selectedRoutineAnalytics: analytics({ source: 'none' }) });

    expect(screen.getByText('Activa historial real para calcularlo.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Programar recordatorio en mi mejor hora' }),
    ).toBeDisabled();
  });

  it('saves the best-hour reminder and shows a confirmation', async () => {
    const user = userEvent.setup();
    onScheduleReminderAtHourMock.mockResolvedValue(undefined);
    renderWidget();

    await user.click(
      screen.getByRole('button', { name: 'Programar recordatorio en mi mejor hora' }),
    );

    expect(onScheduleReminderAtHourMock).toHaveBeenCalledWith(9);
    await waitFor(() => expect(screen.getByText('Guardado')).toBeInTheDocument());
  });

  it('shows the "Guardado" confirmation in the night theme', async () => {
    const user = userEvent.setup();
    onScheduleReminderAtHourMock.mockResolvedValue(undefined);
    renderWidget({ isDay: false, subtleText: 'text-slate-300', panelText: 'text-slate-200' });

    await user.click(
      screen.getByRole('button', { name: 'Programar recordatorio en mi mejor hora' }),
    );

    await waitFor(() => expect(screen.getByText('Guardado')).toBeInTheDocument());
  });

  it('shows an error message when saving the reminder fails', async () => {
    const user = userEvent.setup();
    onScheduleReminderAtHourMock.mockRejectedValue(new Error('network down'));
    renderWidget();

    await user.click(
      screen.getByRole('button', { name: 'Programar recordatorio en mi mejor hora' }),
    );

    expect(await screen.findByText('No se pudo guardar. Intenta de nuevo.')).toBeInTheDocument();
  });

  it('lists struggle-task hints when present', () => {
    renderWidget({
      struggleTasks: [{ taskId: 't1', title: 'Agua', score: 2, hint: 'Divídela en pasos.' }],
    });

    expect(screen.getByText('Agua')).toBeInTheDocument();
    expect(screen.getByText('Divídela en pasos.')).toBeInTheDocument();
  });

  it('renders in the night theme', () => {
    renderWidget({ isDay: false, subtleText: 'text-slate-300', panelText: 'text-slate-200' });
    expect(screen.getByText(/3 completadas esta semana/)).toBeInTheDocument();
  });

  it('does nothing when clicked without a userId', async () => {
    const user = userEvent.setup();
    renderWidget({ userId: null });

    await user.click(
      screen.getByRole('button', { name: 'Programar recordatorio en mi mejor hora' }),
    );
    expect(onScheduleReminderAtHourMock).not.toHaveBeenCalled();
  });

  it('hides the "Guardado" confirmation again after the timeout elapses', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    onScheduleReminderAtHourMock.mockResolvedValue(undefined);
    renderWidget();

    await user.click(
      screen.getByRole('button', { name: 'Programar recordatorio en mi mejor hora' }),
    );
    await waitFor(() => expect(screen.getByText('Guardado')).toBeInTheDocument());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });

    expect(screen.queryByText('Guardado')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
