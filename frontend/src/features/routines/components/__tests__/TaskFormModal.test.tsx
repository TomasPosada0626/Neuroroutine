import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskFormModal } from '../TaskFormModal';

describe('TaskFormModal', () => {
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
});
