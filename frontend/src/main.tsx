import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { initSentry } from '@/shared/observability/initSentry';
import { queryClient } from '@/shared/api/queryClient';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

const root = createRoot(rootEl);

function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // Keep startup resilient even if SW registration fails.
    });
  });
}

function setBuildMarker() {
  const sha = import.meta.env.VITE_BUILD_SHA as string | undefined;
  const runNumber = import.meta.env.VITE_BUILD_RUN_NUMBER as string | undefined;
  const shortSha = sha ? sha.slice(0, 7) : undefined;
  const marker = [shortSha, runNumber].filter(Boolean).join('-') || 'dev';

  const el = document.querySelector('meta[name="x-build"]');
  el?.setAttribute('content', marker);
}

setBuildMarker();
registerServiceWorker();

initSentry();

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function renderConfigError(message: string) {
  root.render(
    <div style={{ fontFamily: 'ui-sans-serif, system-ui', padding: 24 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>NeuroRoutine misconfigured</h1>
      <p style={{ marginBottom: 12 }}>{message}</p>
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          background: '#0b1220',
          color: '#e5e7eb',
          padding: 12,
          borderRadius: 8,
        }}
      >
        Required env vars in Vercel:
        {'\n'}- VITE_SUPABASE_URL (https://xxxx.supabase.co)
        {'\n'}- VITE_SUPABASE_ANON_KEY (sb_publishable_...)
      </pre>
    </div>,
  );
}

if (!supabaseUrl || !supabaseAnonKey) {
  renderConfigError(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel and redeploy.',
  );
} else {
  void import('./app/App')
    .then(({ App }) => {
      root.render(
        <StrictMode>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </QueryClientProvider>
          </ErrorBoundary>
        </StrictMode>,
      );
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      renderConfigError(`Failed to load app bundle: ${message}`);
    });
}
