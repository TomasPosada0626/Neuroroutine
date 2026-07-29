import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoutineFormModal } from '../RoutineFormModal';

describe('RoutineFormModal', () => {
  it('pre-fills fields from initialValues and saves the edited routine', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <RoutineFormModal
        open
        title="Editar rutina"
        confirmLabel="Guardar"
        initialValues={{ title: 'Mañana enfocada', notes: 'Notas viejas' }}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    const titleInput = screen.getByPlaceholderText('Ej: Mañana enfocada') as HTMLInputElement;
    expect(titleInput.value).toBe('Mañana enfocada');

    await user.clear(titleInput);
    await user.type(titleInput, 'Mañana enfocada v2');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Mañana enfocada v2', notes: 'Notas viejas' }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('requires a non-empty title', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <RoutineFormModal
        open
        title="Crear rutina"
        confirmLabel="Crear"
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Crear' }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows a generic error message when saving fails with a non-Error value', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockRejectedValue('boom');

    render(
      <RoutineFormModal
        open
        title="Editar rutina"
        confirmLabel="Guardar"
        initialValues={{ title: 'Rutina' }}
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows the specific error message when saving fails with a real Error', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockRejectedValue(new Error('routine title already exists'));

    render(
      <RoutineFormModal
        open
        title="Editar rutina"
        confirmLabel="Guardar"
        initialValues={{ title: 'Rutina' }}
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('routine title already exists')).toBeInTheDocument();
  });

  it('shows a validation error when notes are too long', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <RoutineFormModal
        open
        title="Editar rutina"
        confirmLabel="Guardar"
        initialValues={{ title: 'Rutina' }}
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Pequeñas reglas, intención, recordatorios…'), {
      target: { value: 'x'.repeat(501) },
    });
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(
      await screen.findByText('Too big: expected string to have <=500 characters'),
    ).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables the footer buttons while loading', () => {
    render(
      <RoutineFormModal
        open
        title="Editar rutina"
        confirmLabel="Guardar"
        loading
        onClose={() => {}}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('renders optional children inside the form', () => {
    render(
      <RoutineFormModal
        open
        title="Crear rutina"
        confirmLabel="Crear"
        onClose={() => {}}
        onConfirm={vi.fn()}
      >
        <div>Extra content</div>
      </RoutineFormModal>,
    );

    expect(screen.getByText('Extra content')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(
      <RoutineFormModal
        open={false}
        title="Editar rutina"
        confirmLabel="Guardar"
        onClose={() => {}}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.queryByText('Editar rutina')).not.toBeInTheDocument();
  });
});
