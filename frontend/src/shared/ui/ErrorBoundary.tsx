import { Component, type ErrorInfo, type ReactNode } from 'react';
import * as Sentry from '@sentry/react';

type Props = { children: ReactNode };
type State = { error: Error | null };

// Plain inline styles rather than Tailwind classes: this is the last line of defense when
// something elsewhere in the render tree throws, so it deliberately doesn't depend on anything
// that could itself be broken (theme state, CSS class generation, etc.) — same reasoning as
// main.tsx's own renderConfigError fallback.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            fontFamily: 'ui-sans-serif, system-ui',
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Algo salió mal</h1>
          <p style={{ color: '#64748b', maxWidth: 360 }}>
            Ocurrió un error inesperado. Recarga la página para continuar.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              borderRadius: 8,
              padding: '8px 16px',
              background: '#0f172a',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Recargar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
