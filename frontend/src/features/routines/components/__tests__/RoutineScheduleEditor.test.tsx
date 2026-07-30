import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoutineScheduleEditor } from '../RoutineScheduleEditor';

function renderEditor(props: Partial<React.ComponentProps<typeof RoutineScheduleEditor>> = {}) {
  return render(
    <RoutineScheduleEditor
      routineId="r1"
      schedule={undefined}
      onSetSchedule={() => {}}
      isDay
      subtleText="text-slate-600"
      {...props}
    />,
  );
}

describe('RoutineScheduleEditor', () => {
  it('shows "Sin programación" when nothing is configured', () => {
    renderEditor();
    expect(screen.getByText('Sin programación')).toBeInTheDocument();
  });

  it('formats a schedule summary with days and an hour', () => {
    renderEditor({ schedule: { daysOfWeek: [3, 1, 5], hour: 7 } });
    expect(screen.getByText('L X V · 07:00')).toBeInTheDocument();
  });

  it('formats a schedule summary with an hour but no days as "Sin días"', () => {
    renderEditor({ schedule: { daysOfWeek: [], hour: 20 } });
    expect(screen.getByText('Sin días · 20:00')).toBeInTheDocument();
  });

  it('opens and closes the editor panel', async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(screen.queryByText('Días')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Editar programación' }));
    expect(screen.getByText('Días')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ocultar programación' }));
    expect(screen.queryByText('Días')).not.toBeInTheDocument();
  });

  it('adds a day to an empty schedule when toggled on', async () => {
    const user = userEvent.setup();
    const onSetSchedule = vi.fn();
    renderEditor({ onSetSchedule });

    await user.click(screen.getByRole('button', { name: 'Editar programación' }));
    await user.click(screen.getByRole('button', { name: 'L' }));

    expect(onSetSchedule).toHaveBeenLastCalledWith('r1', { daysOfWeek: [1], hour: null });
  });

  it('removes an already-active day when toggled off', async () => {
    const user = userEvent.setup();
    const onSetSchedule = vi.fn();
    renderEditor({ schedule: { daysOfWeek: [1], hour: null }, onSetSchedule });

    await user.click(screen.getByRole('button', { name: 'Editar programación' }));
    await user.click(screen.getByRole('button', { name: 'L' }));

    expect(onSetSchedule).toHaveBeenLastCalledWith('r1', { daysOfWeek: [], hour: null });
  });

  it('clamps an out-of-range schedule hour to the valid 0-23 range', async () => {
    const user = userEvent.setup();
    const onSetSchedule = vi.fn();
    renderEditor({ onSetSchedule });

    await user.click(screen.getByRole('button', { name: 'Editar programación' }));
    const hourInput = screen.getByPlaceholderText('0-23');
    fireEvent.change(hourInput, { target: { value: '99' } });

    expect(onSetSchedule).toHaveBeenLastCalledWith('r1', { daysOfWeek: [], hour: 23 });
  });

  it('clears the hour via "Limpiar" while preserving the configured days', async () => {
    const user = userEvent.setup();
    const onSetSchedule = vi.fn();
    renderEditor({ schedule: { daysOfWeek: [2, 4], hour: 15 }, onSetSchedule });

    await user.click(screen.getByRole('button', { name: 'Editar programación' }));
    await user.click(screen.getByRole('button', { name: 'Limpiar' }));

    expect(onSetSchedule).toHaveBeenLastCalledWith('r1', { daysOfWeek: [2, 4], hour: null });
  });

  it('renders in the night theme', async () => {
    const user = userEvent.setup();
    renderEditor({ isDay: false, subtleText: 'text-slate-300' });

    await user.click(screen.getByRole('button', { name: 'Editar programación' }));
    expect(screen.getByRole('button', { name: 'L' })).toBeInTheDocument();
  });
});
