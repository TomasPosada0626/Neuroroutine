import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ForgotPasswordPage } from '../ForgotPasswordPage';
import { useAuth } from '@/features/auth/authStore';
import { useUiStore } from '@/shared/state/uiStore';

vi.mock('@/features/auth/authStore', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderForgotPasswordPage() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    useUiStore.setState({ theme: 'night' });
  });

  it('shows a validation error for an empty email', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({ requestPasswordReset: vi.fn() } as never);

    renderForgotPasswordPage();
    await user.click(screen.getByRole('button', { name: 'Enviar enlace de recuperación' }));

    expect(await screen.findByText('Ingresa un correo válido')).toBeInTheDocument();
  });

  it('shows the generic confirmation message when the request succeeds', async () => {
    const user = userEvent.setup();
    const requestPasswordReset = vi.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({ requestPasswordReset } as never);

    renderForgotPasswordPage();
    await user.type(screen.getByLabelText('Correo'), 'me@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar enlace de recuperación' }));

    expect(requestPasswordReset).toHaveBeenCalledWith('me@example.com');
    expect(await screen.findByText(/Si existe una cuenta con ese correo/)).toBeInTheDocument();
  });

  it('shows the same generic confirmation message even when the request fails', async () => {
    const user = userEvent.setup();
    const requestPasswordReset = vi.fn().mockRejectedValue(new Error('network down'));
    mockedUseAuth.mockReturnValue({ requestPasswordReset } as never);

    renderForgotPasswordPage();
    await user.type(screen.getByLabelText('Correo'), 'me@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar enlace de recuperación' }));

    expect(await screen.findByText(/Si existe una cuenta con ese correo/)).toBeInTheDocument();
  });

  it('links back to /login from both the form and the confirmation state', async () => {
    const user = userEvent.setup();
    const requestPasswordReset = vi.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({ requestPasswordReset } as never);

    renderForgotPasswordPage();
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' })).toHaveAttribute(
      'href',
      '/login',
    );

    await user.type(screen.getByLabelText('Correo'), 'me@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar enlace de recuperación' }));

    expect(await screen.findByRole('link', { name: 'Volver a iniciar sesión' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('renders with day-theme styling', () => {
    useUiStore.setState({ theme: 'day' });
    mockedUseAuth.mockReturnValue({ requestPasswordReset: vi.fn() } as never);

    renderForgotPasswordPage();

    expect(screen.getByLabelText('Correo')).toBeInTheDocument();
  });

  it('renders the confirmation message with day-theme styling', async () => {
    const user = userEvent.setup();
    useUiStore.setState({ theme: 'day' });
    mockedUseAuth.mockReturnValue({
      requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    } as never);

    renderForgotPasswordPage();
    await user.type(screen.getByLabelText('Correo'), 'me@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar enlace de recuperación' }));

    expect(await screen.findByText(/Si existe una cuenta con ese correo/)).toBeInTheDocument();
  });
});
