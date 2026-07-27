import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';

vi.mock('../../pages/LandingPage', () => ({
  LandingPage: () => <div>Landing</div>,
}));
vi.mock('@/pages/DashboardPage', () => ({
  DashboardPage: () => <div>Dashboard</div>,
}));
vi.mock('@/pages/LoginPage', () => ({
  LoginPage: () => <div>Login</div>,
}));
vi.mock('@/pages/RegisterPage', () => ({
  RegisterPage: () => <div>Register</div>,
}));
vi.mock('@/features/auth/RequireAuth', async () => {
  const { Outlet } = await import('react-router-dom');
  return { RequireAuth: () => <Outlet /> };
});

const initMock = vi.fn();
vi.mock('@/features/auth/authStore', () => ({
  useAuth: () => ({ init: initMock }),
}));

const syncOfflineTasksMock = vi.fn();
vi.mock('@/features/routines/routinesStore', () => ({
  useRoutinesStore: {
    getState: () => ({ syncOfflineTasks: syncOfflineTasksMock }),
  },
}));

const uiState = vi.hoisted(() => ({ theme: 'night' as 'day' | 'night' }));
vi.mock('@/shared/state/uiStore', () => ({
  useUiStore: (selector: (s: { theme: string }) => unknown) => selector({ theme: uiState.theme }),
}));

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App', () => {
  beforeEach(() => {
    uiState.theme = 'night';
    initMock.mockReset().mockResolvedValue(vi.fn());
    syncOfflineTasksMock.mockReset();
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: true,
    });
  });

  it('renders the landing page at /', () => {
    renderApp('/');
    expect(screen.getByText('Landing')).toBeInTheDocument();
  });

  it('renders the login and register routes', async () => {
    renderApp('/login');
    expect(await screen.findByText('Login')).toBeInTheDocument();
  });

  it('redirects unknown routes to /', () => {
    renderApp('/does-not-exist');
    expect(screen.getByText('Landing')).toBeInTheDocument();
  });

  it('renders the protected dashboard route via RequireAuth', async () => {
    renderApp('/app');
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });

  it('initializes auth on mount and unsubscribes on unmount', async () => {
    const unsubscribe = vi.fn();
    initMock.mockResolvedValue(unsubscribe);

    const { unmount } = renderApp('/');
    await waitFor(() => expect(initMock).toHaveBeenCalledTimes(1));

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('applies night-mode classes by default', () => {
    renderApp('/');
    expect(document.documentElement.classList.contains('nr-night')).toBe(true);
    expect(document.documentElement.classList.contains('nr-day')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('applies day-mode classes when the theme is day', () => {
    uiState.theme = 'day';
    renderApp('/');
    expect(document.documentElement.classList.contains('nr-day')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('syncs offline tasks immediately when online', () => {
    renderApp('/');
    expect(syncOfflineTasksMock).toHaveBeenCalledTimes(1);
  });

  it('does not sync immediately when offline, but does on the online event', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: false,
    });

    renderApp('/');
    expect(syncOfflineTasksMock).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(syncOfflineTasksMock).toHaveBeenCalledTimes(1);
  });
});
