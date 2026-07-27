import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskFormModal } from '../TaskFormModal';

const uiState = vi.hoisted(() => ({ theme: 'night' as 'day' | 'night' }));
vi.mock('@/shared/state/uiStore', () => ({
  useUiStore: (selector: (s: { theme: 'day' | 'night' }) => unknown) =>
    selector({ theme: uiState.theme }),
}));

describe('TaskFormModal', () => {
  beforeEach(() => {
    uiState.theme = 'night';
  });

  it('pre-fills fields from initialValues and saves the edited task', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <TaskFormModal
        open
        initialValues={{
          title: 'Tomar agua',
          description: '2 litros',
          due_date: '2026-08-01',
          due_time: '09:00',
          is_recurring: false,
        }}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    const titleInput = screen.getByLabelText('Título') as HTMLInputElement;
    expect(titleInput.value).toBe('Tomar agua');

    await user.clear(titleInput);
    await user.type(titleInput, 'Tomar 2L de agua');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tomar 2L de agua', description: '2 litros' }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('requires a non-empty title', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(<TaskFormModal open onClose={() => {}} onConfirm={onConfirm} />);

    await user.clear(screen.getByLabelText('Título'));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('clears and disables the date field when "Repetir cada día" is checked', async () => {
    const user = userEvent.setup();

    render(
      <TaskFormModal
        open
        initialValues={{ title: 'Task', due_date: '2026-08-01', is_recurring: false }}
        onClose={() => {}}
        onConfirm={vi.fn()}
      />,
    );

    const dateInput = screen.getByLabelText('Fecha (opcional)') as HTMLInputElement;
    expect(dateInput.value).toBe('2026-08-01');

    await user.click(screen.getByRole('checkbox', { name: /Repetir cada día/ }));

    expect(dateInput).toBeDisabled();
    expect(dateInput.value).toBe('');
  });

  it('shows a generic error message when saving fails with a non-Error value', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockRejectedValue('boom');

    render(
      <TaskFormModal
        open
        initialValues={{ title: 'Task' }}
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(<TaskFormModal open={false} onClose={() => {}} onConfirm={vi.fn()} />);
    expect(screen.queryByText('Editar tarea')).not.toBeInTheDocument();
  });

  it('hides the weekly day picker unless the task is recurring', () => {
    render(<TaskFormModal open onClose={() => {}} onConfirm={vi.fn()} />);
    expect(screen.queryByText('Días de la semana (opcional)')).not.toBeInTheDocument();
  });

  it('shows the day picker once recurring is checked and submits the selected days', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskFormModal
        open
        initialValues={{ title: 'Meditar' }}
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: /Repetir cada día/ }));
    expect(screen.getByText('Días de la semana (opcional)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Repetir el día L' }));
    await user.click(screen.getByRole('button', { name: 'Repetir el día V' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ is_recurring: true, recurrence_days_of_week: [1, 5] }),
    );
  });

  it('pre-fills active day pills from initialValues and lets the user remove one', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskFormModal
        open
        initialValues={{ title: 'Gym', is_recurring: true, recurrence_days_of_week: [1, 3, 5] }}
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole('button', { name: 'Repetir el día L' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Repetir el día X' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ recurrence_days_of_week: [1, 5] }),
    );
  });

  it('renders the day picker with day-theme styling', async () => {
    uiState.theme = 'day';
    const user = userEvent.setup();

    render(
      <TaskFormModal
        open
        initialValues={{ title: 'Meditar' }}
        onClose={() => {}}
        onConfirm={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: /Repetir cada día/ }));
    const dayButton = screen.getByRole('button', { name: 'Repetir el día L' });

    await user.click(dayButton);
    expect(dayButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('leaves recurrence days empty ("every day") when none are picked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskFormModal
        open
        initialValues={{ title: 'Meditar' }}
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: /Repetir cada día/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ is_recurring: true, recurrence_days_of_week: [] }),
    );
  });
});
