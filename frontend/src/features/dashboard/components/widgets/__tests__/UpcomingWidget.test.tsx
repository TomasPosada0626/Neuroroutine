import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpcomingWidget } from '../UpcomingWidget';
import { computeNext7Days } from '@/features/dashboard/utils/dashboardAnalytics';
import type { Routine } from '@/shared/types/routines';

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

function renderWidget(props: Partial<React.ComponentProps<typeof UpcomingWidget>> = {}) {
  const next7Days = computeNext7Days(new Date(2026, 6, 28));
  return render(
    <UpcomingWidget
      routines={[]}
      routineScheduleById={{}}
      next7Days={next7Days}
      scheduledRoutinesByDow={new Map()}
      onStartSession={() => {}}
      onCustomize={() => {}}
      onApplyDemoScheduleDefaults={() => {}}
      isDay
      subtleText="text-slate-600"
      panelText="text-slate-700"
      collapsed={false}
      onToggleCollapsed={() => {}}
      {...props}
    />,
  );
}

describe('UpcomingWidget', () => {
  it('shows the empty-schedule state with a Personalizar action', async () => {
    const user = userEvent.setup();
    const onCustomize = vi.fn();
    renderWidget({ onCustomize });

    expect(
      screen.getByText('No hay rutinas programadas para los próximos 7 días.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Personalizar' }));
    expect(onCustomize).toHaveBeenCalled();
  });

  it('offers Autoprogramar only when routines exist without any schedule', () => {
    renderWidget({ routines: [routine('r1', 'Mañana enfocada')] });
    expect(screen.getAllByRole('button', { name: 'Autoprogramar' }).length).toBeGreaterThan(0);
  });

  it('lists a scheduled routine for the matching weekday', () => {
    const todayDow = new Date(2026, 6, 28).getDay();
    renderWidget({
      routines: [routine('r1', 'Mañana enfocada')],
      routineScheduleById: { r1: { daysOfWeek: [todayDow], hour: 9 } },
      scheduledRoutinesByDow: new Map([[todayDow, ['r1']]]),
    });

    expect(screen.getByText('Mañana enfocada')).toBeInTheDocument();
    expect(screen.getAllByText('1 en 7 días').length).toBeGreaterThan(0);
  });

  it('renders multiple scheduled routines on one day (sort, extras, night theme)', () => {
    const todayDow = new Date(2026, 6, 28).getDay();
    const routines = [
      routine('r1', 'Zeta'),
      routine('r2', 'Alfa'),
      routine('r3', 'Beta'),
      routine('r4', 'Meditar'),
    ];
    renderWidget({
      isDay: false,
      subtleText: 'text-slate-300',
      panelText: 'text-slate-200',
      routines,
      routineScheduleById: {
        r1: { daysOfWeek: [todayDow], hour: 14 },
        r2: { daysOfWeek: [todayDow], hour: 9 },
        r3: { daysOfWeek: [todayDow], hour: 9 },
        r4: { daysOfWeek: [todayDow], hour: null },
      },
      scheduledRoutinesByDow: new Map([[todayDow, ['r1', 'r2', 'r3', 'r4']]]),
    });

    // 4 items on the same day: sort() runs its comparator, and the 4th overflows maxSlots (3).
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('shows the selected day detail with an hourless item and starts a session', async () => {
    const user = userEvent.setup();
    const todayDow = new Date(2026, 6, 28).getDay();
    const onStartSession = vi.fn();
    renderWidget({
      routines: [routine('r4', 'Meditar')],
      routineScheduleById: { r4: { daysOfWeek: [todayDow], hour: null } },
      scheduledRoutinesByDow: new Map([[todayDow, ['r4']]]),
      onStartSession,
    });

    await user.click(screen.getByRole('button', { name: /Hoy/ }));
    expect(screen.getByText('Sin hora')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Empezar' }));
    expect(onStartSession).toHaveBeenCalledWith('r4');
  });

  it('shows an empty message for a selected day with nothing scheduled', async () => {
    const user = userEvent.setup();
    const todayDow = new Date(2026, 6, 28).getDay();
    renderWidget({
      routines: [routine('r1', 'Mañana enfocada')],
      routineScheduleById: { r1: { daysOfWeek: [todayDow], hour: 9 } },
      scheduledRoutinesByDow: new Map([[todayDow, ['r1']]]),
    });

    // All 7 mini-calendar day buttons carry aria-pressed; index 1 is tomorrow, unscheduled.
    const dayButtons = screen.getAllByRole('button', { pressed: false });
    await user.click(dayButtons[1]!);
    expect(screen.getByText('No hay rutinas programadas para este día.')).toBeInTheDocument();
  });

  it('shows a "+N más" summary when more than 6 routines are upcoming', () => {
    const todayDow = new Date(2026, 6, 28).getDay();
    const tomorrowDow = new Date(2026, 6, 29).getDay();
    const routines = Array.from({ length: 7 }, (_, i) => routine(`r${i}`, `Rutina ${i}`));
    renderWidget({
      routines,
      routineScheduleById: Object.fromEntries(
        routines.map((r) => [r.id, { daysOfWeek: [todayDow], hour: null }]),
      ),
      scheduledRoutinesByDow: new Map([
        [todayDow, routines.slice(0, 4).map((r) => r.id)],
        [tomorrowDow, routines.slice(4).map((r) => r.id)],
      ]),
    });

    expect(screen.getByText('+1 más')).toBeInTheDocument();
  });

  it('opens and closes the day detail panel when a calendar day is clicked', async () => {
    const user = userEvent.setup();
    const todayDow = new Date(2026, 6, 28).getDay();
    renderWidget({
      routines: [routine('r1', 'Mañana enfocada')],
      routineScheduleById: { r1: { daysOfWeek: [todayDow], hour: null } },
      scheduledRoutinesByDow: new Map([[todayDow, ['r1']]]),
    });

    await user.click(screen.getByRole('button', { name: /Hoy/ }));
    expect(screen.getByText(/Seleccionado: Hoy/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(
      screen.getByText('Toca un día del calendario para ver sus rutinas.'),
    ).toBeInTheDocument();
  });
});
