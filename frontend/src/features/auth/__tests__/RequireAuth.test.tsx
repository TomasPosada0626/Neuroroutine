import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '../RequireAuth';
import { useAuth } from '../authStore';

vi.mock('../authStore', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderAtAppRoute() {
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/app" element={<div>Protected content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('shows a loading state while the session is resolving', () => {
    mockedUseAuth.mockReturnValue({ loading: true, session: null } as never);

    renderAtAppRoute();

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects to /login when there is no session', () => {
    mockedUseAuth.mockReturnValue({ loading: false, session: null } as never);

    renderAtAppRoute();

    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders the protected route when a session exists', () => {
    mockedUseAuth.mockReturnValue({ loading: false, session: { user: {} } } as never);

    renderAtAppRoute();

    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});
