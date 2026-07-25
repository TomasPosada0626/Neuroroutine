import * as Sentry from '@sentry/react';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
}));

describe('initSentry', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('does not initialize Sentry when no DSN is configured', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    const { initSentry } = await import('../initSentry');

    initSentry();

    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('initializes with browser tracing and a reduced sample rate in production', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://example.test/1');
    vi.stubEnv('PROD', true);
    const { initSentry } = await import('../initSentry');

    initSentry();

    expect(Sentry.browserTracingIntegration).toHaveBeenCalled();
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://example.test/1',
        sendDefaultPii: false,
        tracesSampleRate: 0.2,
      }),
    );
  });

  it('samples every transaction outside production', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://example.test/1');
    vi.stubEnv('PROD', false);
    const { initSentry } = await import('../initSentry');

    initSentry();

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ tracesSampleRate: 1 }),
    );
  });
});
