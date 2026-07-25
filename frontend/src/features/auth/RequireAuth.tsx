import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './authStore';
import { useUiStore } from '@/shared/state/uiStore';

export function RequireAuth() {
  const { loading, session } = useAuth();
  const location = useLocation();
  const theme = useUiStore((s) => s.theme);
  const isDay = theme === 'day';

  if (loading) {
    return (
      <div
        className={
          'min-h-dvh grid place-items-center ' +
          (isDay ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-50')
        }
      >
        <div className={'text-sm ' + (isDay ? 'text-slate-600' : 'text-slate-300')}>Loading…</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
