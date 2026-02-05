import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './authStore'

export function RequireAuth() {
  const { loading, session } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <div className="text-sm text-slate-600">Loading…</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
