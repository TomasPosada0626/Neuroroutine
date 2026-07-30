import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RegisterPage } from '../RegisterPage';
import { useAuth } from '@/features/auth/authStore';
import { useUiStore } from '@/shared/state/uiStore';

vi.mock('@/features/auth/authStore', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderRegisterPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/app" element={<div>Dashboard</div>} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre'), 'Ana');
  await user.type(screen.getByLabelText('Apellidos'), 'García');
  await user.type(screen.getByLabelText('Nombre de usuario'), 'ana.garcia');
  await user.type(screen.getByLabelText('Email'), 'ana@example.com');
  await user.type(screen.getByLabelText('Contraseña'), 'supersecret1');
  await user.type(screen.getByLabelText('Confirmar'), 'supersecret1');
}

describe('RegisterPage', () => {
  beforeEach(() => {
    useUiStore.setState({ theme: 'night' });
  });

  it('redirects to /app when a session already exists', () => {
    mockedUseAuth.mockReturnValue({
      session: { user: {} },
      signUpWithPassword: vi.fn(),
      signInWithGoogle: vi.fn(),
    } as never);

    renderRegisterPage();

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('registers and navigates to /app when no email confirmation is needed', async () => {
    const user = userEvent.setup();
    const signUpWithPassword = vi.fn().mockResolvedValue({ needsEmailConfirmation: false });
    mockedUseAuth.mockReturnValue({
      session: null,
      signUpWithPassword,
      signInWithGoogle: vi.fn(),
    } as never);

    renderRegisterPage();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(signUpWithPassword).toHaveBeenCalledWith({
        email: 'ana@example.com',
        password: 'supersecret1',
        username: 'ana.garcia',
        firstName: 'Ana',
        lastName: 'García',
      });
    });
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('navigates to /login when email confirmation is needed', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({
      session: null,
      signUpWithPassword: vi.fn().mockResolvedValue({ needsEmailConfirmation: true }),
      signInWithGoogle: vi.fn(),
    } as never);

    renderRegisterPage();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('shows validation errors for empty required fields', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({
      session: null,
      signUpWithPassword: vi.fn(),
      signInWithGoogle: vi.fn(),
    } as never);

    renderRegisterPage();
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Nombre muy corto')).toBeInTheDocument();
    expect(screen.getByText('Apellidos muy cortos')).toBeInTheDocument();
    expect(screen.getByText('El usuario es obligatorio')).toBeInTheDocument();
  });

  it('shows a validation error when passwords do not match', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({
      session: null,
      signUpWithPassword: vi.fn(),
      signInWithGoogle: vi.fn(),
    } as never);

    renderRegisterPage();
    await user.type(screen.getByLabelText('Nombre'), 'Ana');
    await user.type(screen.getByLabelText('Apellidos'), 'García');
    await user.type(screen.getByLabelText('Nombre de usuario'), 'ana.garcia');
    await user.type(screen.getByLabelText('Email'), 'ana@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'supersecret1');
    await user.type(screen.getByLabelText('Confirmar'), 'different123');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
  });

  it('shows the specific error message when registration fails with a real Error', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({
      session: null,
      signUpWithPassword: vi.fn().mockRejectedValue(new Error('Username taken')),
      signInWithGoogle: vi.fn(),
    } as never);

    renderRegisterPage();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Username taken')).toBeInTheDocument();
  });

  it('shows a generic error message when registration fails with a non-Error value', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({
      session: null,
      signUpWithPassword: vi.fn().mockRejectedValue('nope'),
      signInWithGoogle: vi.fn(),
    } as never);

    renderRegisterPage();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Registration failed')).toBeInTheDocument();
  });

  it('signs up with Google and shows an error message when it fails', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({
      session: null,
      signUpWithPassword: vi.fn(),
      signInWithGoogle: vi.fn().mockRejectedValue(new Error('Google down')),
    } as never);

    renderRegisterPage();
    await user.click(screen.getByRole('button', { name: 'Continuar con Google' }));

    expect(await screen.findByText('Google down')).toBeInTheDocument();
  });

  it('shows a generic error message when Google sign-in fails with a non-Error value', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({
      session: null,
      signUpWithPassword: vi.fn(),
      signInWithGoogle: vi.fn().mockRejectedValue('nope'),
    } as never);

    renderRegisterPage();
    await user.click(screen.getByRole('button', { name: 'Continuar con Google' }));

    expect(await screen.findByText('Google login failed')).toBeInTheDocument();
  });

  it('renders with day-theme styling', () => {
    useUiStore.setState({ theme: 'day' });
    mockedUseAuth.mockReturnValue({
      session: null,
      signUpWithPassword: vi.fn(),
      signInWithGoogle: vi.fn(),
    } as never);

    renderRegisterPage();

    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
  });
});
