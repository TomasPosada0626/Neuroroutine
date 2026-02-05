import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/features/auth/authStore'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'

export function App() {
  const { init } = useAuth()

  useEffect(() => {
    let unsubscribe: (() => void) | null = null
    void (async () => {
      unsubscribe = await init()
    })()

    return () => {
      unsubscribe?.()
    }
  }, [init])

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/app" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
