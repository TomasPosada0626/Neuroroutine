import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/features/auth/authStore';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { useRoutinesStore } from '@/features/routines/routinesStore';
import { LandingPage } from '../pages/LandingPage';
import { useUiStore } from '@/shared/state/uiStore';

// Code-split everything past the landing page: it's the only route that must be
// on the critical initial-paint path, the rest can load once that's interactive.
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() =>
  import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);

function RouteFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#0b1120] text-sm text-slate-300">
      Cargando…
    </div>
  );
}

export function App() {
  const { init } = useAuth();
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    void (async () => {
      unsubscribe = await init();
    })();

    return () => {
      unsubscribe?.();
    };
  }, [init]);

  useEffect(() => {
    const isDay = theme === 'day';
    document.documentElement.style.colorScheme = isDay ? 'light' : 'dark';
    document.documentElement.classList.toggle('nr-day', isDay);
    document.documentElement.classList.toggle('nr-night', !isDay);
  }, [theme]);

  useEffect(() => {
    const sync = () => {
      void useRoutinesStore.getState().syncOfflineTasks();
    };

    if (typeof navigator === 'undefined' || navigator.onLine) sync();
    window.addEventListener('online', sync);

    return () => window.removeEventListener('online', sync);
  }, []);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/app" element={<DashboardPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
