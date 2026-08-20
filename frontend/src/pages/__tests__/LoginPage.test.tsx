import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import { useAuth } from '@/features/auth/authStore';
import { useUiStore } from '@/shared/state/uiStore';

vi.mock('@/features/auth/authStore', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/app" element={<div>Dashboard</div>} />
        <Route path="/register" element={<div>Register page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    useUiStore.setState({ theme: 'night' });
  });

  it('redirects to /app when a session already exists', () => {
    mockedUseAuth.mockReturnValue({
      session: { user: {} },
      signInWithPassword: vi.fn(),
      signInWithGoogle: vi.fn(),
    } as never);

    renderLoginPage();

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('signs in with valid credentials and navigates to /app', async () => {
    const user = userEvent.setup();
    const signInWithPassword = vi.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({
      session: null,
      signInWithPassword,
      signInWithGoogle: vi.fn(),
    } as never);

    renderLoginPage();

    await user.type(screen.getByTestId('login-identifier'), 'me@example.com');
    await user.type(screen.getByTestId('login-password'), 'secret123');
    await user.click(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith('me@example.com', 'secret123');
    });
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('shows a validation error for an empty identifier and password', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({
      session: null,
      signInWithPassword: vi.fn(),
      signInWithGoogle: vi.fn(),
    } as never);

    renderLoginPage();

    await user.click(screen.getByTestId('login-submit'));

    expect(await screen.findByText('Este campo es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument();
  });

  it('shows the specific error message when sign-in fails with a real Error', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({
      session: null,
      signInWithPassword: vi.fn().mockRejectedValue(new Error('Invalid credentials')),
      signInWithGoogle: vi.fn(),
    } as never);

    renderLoginPage();

    await user.type(screen.getByTestId('login-identifier'), 'me@example.com');
    await user.type(screen.getByTestId('login-password'), 'secret123');
    await user.click(screen.getByTestId('login-submit'));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('shows a generic error message when sign-in fails with a non-Error value', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({
      session: null,
      signInWithPassword: vi.fn().mockRejectedValue('nope'),
      signInWithGoogle: vi.fn(),
    } as never);

    renderLoginPage();

    await user.type(screen.getByTestId('login-identifier'), 'me@example.com');
    await user.type(screen.getByTestId('login-password'), 'secret123');
    await user.click(screen.getByTestId('login-submit'));

    expect(await screen.findByText('No se pudo iniciar sesión')).toBeInTheDocument();
  });

  it('signs in with Google', async () => {
    const user = userEvent.setup();
    const signInWithGoogle = vi.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({
      session: null,
      signInWithPassword: vi.fn(),
      signInWithGoogle,
    } as never);

    renderLoginPage();

    await user.click(screen.getByRole('button', { name: 'Continuar con Google' }));

    expect(signInWithGoogle).toHaveBeenCalled();
  });

  it('shows an error message when Google sign-in fails', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({
      session: null,
      signInWithPassword: vi.fn(),
      signInWithGoogle: vi.fn().mockRejectedValue(new Error('Google down')),
    } as never);

    renderLoginPage();

    await user.click(screen.getByRole('button', { name: 'Continuar con Google' }));

    expect(await screen.findByText('Google down')).toBeInTheDocument();
  });

  it('shows a generic error message when Google sign-in fails with a non-Error value', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({
      session: null,
      signInWithPassword: vi.fn(),
      signInWithGoogle: vi.fn().mockRejectedValue('nope'),
    } as never);

    renderLoginPage();

    await user.click(screen.getByRole('button', { name: 'Continuar con Google' }));

    expect(await screen.findByText('No se pudo iniciar sesión con Google')).toBeInTheDocument();
  });

  it('links to the register and forgot-password routes', () => {
    mockedUseAuth.mockReturnValue({
      session: null,
      signInWithPassword: vi.fn(),
      signInWithGoogle: vi.fn(),
    } as never);

    renderLoginPage();

    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  it('renders with day-theme styling', () => {
    useUiStore.setState({ theme: 'day' });
    mockedUseAuth.mockReturnValue({
      session: null,
      signInWithPassword: vi.fn(),
      signInWithGoogle: vi.fn(),
    } as never);

    renderLoginPage();

    expect(screen.getByTestId('login-identifier')).toBeInTheDocument();
  });
});
