import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../ErrorBoundary';

const captureExceptionMock = vi.fn();
vi.mock('@sentry/react', () => ({
  captureException: (...args: unknown[]) => captureExceptionMock(...args),
}));

function Bomb(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    captureExceptionMock.mockClear();
  });

  it('renders children normally when nothing throws', () => {
    render(
      <ErrorBoundary>
        <div>All good</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('All good')).toBeInTheDocument();
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('renders a fallback and reports to Sentry when a child throws', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    expect(screen.queryByText('All good')).not.toBeInTheDocument();
    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'boom' }),
      expect.objectContaining({
        extra: expect.objectContaining({ componentStack: expect.any(String) }),
      }),
    );

    consoleError.mockRestore();
  });

  it('reloads the page when the recover button is clicked', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reload = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload },
    });

    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    await user.click(screen.getByRole('button', { name: 'Recargar' }));
    expect(reload).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    consoleError.mockRestore();
  });
});
