import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ResetPasswordPage } from '../ResetPasswordPage';
import { useAuth } from '@/features/auth/authStore';
import { useUiStore } from '@/shared/state/uiStore';

vi.mock('@/features/auth/authStore', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderResetPasswordPage() {
  return render(
    <MemoryRouter initialEntries={['/reset-password']}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/app" element={<div>Dashboard</div>} />
        <Route path="/forgot-password" element={<div>Forgot password page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    useUiStore.setState({ theme: 'night' });
  });

  it('shows a loading state while the recovery session is resolving', () => {
    mockedUseAuth.mockReturnValue({
      session: null,
      loading: true,
      updatePassword: vi.fn(),
    } as never);

    renderResetPasswordPage();

    expect(screen.getByText('Verificando enlace…')).toBeInTheDocument();
  });

  it('shows an invalid-link message with a link to request a new one when there is no session', () => {
    mockedUseAuth.mockReturnValue({
      session: null,
      loading: false,
      updatePassword: vi.fn(),
    } as never);

    renderResetPasswordPage();

    expect(
      screen.getByText('Este enlace de recuperación no es válido o ya expiró.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solicitar un nuevo enlace' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  it('updates the password and navigates to /app on success', async () => {
    const user = userEvent.setup();
    const updatePassword = vi.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({
      session: { user: {} },
      loading: false,
      updatePassword,
    } as never);

    renderResetPasswordPage();
    await user.type(screen.getByLabelText('Nueva contraseña'), 'supersecret1');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'supersecret1');
    await user.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }));

    await waitFor(() => {
      expect(updatePassword).toHaveBeenCalledWith('supersecret1');
    });
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('shows a validation error when passwords do not match', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({
      session: { user: {} },
      loading: false,
      updatePassword: vi.fn(),
    } as never);

    renderResetPasswordPage();
    await user.type(screen.getByLabelText('Nueva contraseña'), 'supersecret1');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'different12');
    await user.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }));

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
  });

  it('shows a validation error when the password is too short', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({
      session: { user: {} },
      loading: false,
      updatePassword: vi.fn(),
    } as never);

    renderResetPasswordPage();
    await user.type(screen.getByLabelText('Nueva contraseña'), 'short');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'short');
    await user.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }));

    expect(await screen.findAllByText('Debe tener al menos 10 caracteres')).toHaveLength(2);
  });

  it('shows the specific error message when updating fails with a real Error', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({
      session: { user: {} },
      loading: false,
      updatePassword: vi.fn().mockRejectedValue(new Error('El enlace ya expiró')),
    } as never);

    renderResetPasswordPage();
    await user.type(screen.getByLabelText('Nueva contraseña'), 'supersecret1');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'supersecret1');
    await user.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }));

    expect(await screen.findByText('El enlace ya expiró')).toBeInTheDocument();
  });

  it('shows a generic error message when updating fails with a non-Error value', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({
      session: { user: {} },
      loading: false,
      updatePassword: vi.fn().mockRejectedValue('nope'),
    } as never);

    renderResetPasswordPage();
    await user.type(screen.getByLabelText('Nueva contraseña'), 'supersecret1');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'supersecret1');
    await user.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }));

    expect(await screen.findByText('No se pudo actualizar la contraseña')).toBeInTheDocument();
  });

  it('renders with day-theme styling', () => {
    useUiStore.setState({ theme: 'day' });
    mockedUseAuth.mockReturnValue({
      session: { user: {} },
      loading: false,
      updatePassword: vi.fn(),
    } as never);

    renderResetPasswordPage();

    expect(screen.getByLabelText('Nueva contraseña')).toBeInTheDocument();
  });

  it('renders the loading state with day-theme styling', () => {
    useUiStore.setState({ theme: 'day' });
    mockedUseAuth.mockReturnValue({
      session: null,
      loading: true,
      updatePassword: vi.fn(),
    } as never);

    renderResetPasswordPage();

    expect(screen.getByText('Verificando enlace…')).toBeInTheDocument();
  });

  it('renders the invalid-link state with day-theme styling', () => {
    useUiStore.setState({ theme: 'day' });
    mockedUseAuth.mockReturnValue({
      session: null,
      loading: false,
      updatePassword: vi.fn(),
    } as never);

    renderResetPasswordPage();

    expect(
      screen.getByText('Este enlace de recuperación no es válido o ya expiró.'),
    ).toBeInTheDocument();
  });
});
