import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/features/auth/authStore'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { useRoutinesStore } from '@/features/routines/routinesStore'
import { DashboardPage } from '@/pages/DashboardPage'
import { LandingPage } from '../pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { useUiStore } from '@/shared/state/uiStore'

export function App() {
  const { init } = useAuth()
  const theme = useUiStore((s) => s.theme)

  useEffect(() => {
    let unsubscribe: (() => void) | null = null
    void (async () => {
      unsubscribe = await init()
    })()

    return () => {
      unsubscribe?.()
    }
  }, [init])

  useEffect(() => {
    const isDay = theme === 'day'
    document.documentElement.style.colorScheme = isDay ? 'light' : 'dark'
    document.documentElement.classList.toggle('nr-day', isDay)
    document.documentElement.classList.toggle('nr-night', !isDay)
  }, [theme])

  useEffect(() => {
    const sync = () => {
      void useRoutinesStore.getState().syncOfflineTasks()
    }

    if (typeof navigator === 'undefined' || navigator.onLine) sync()
    window.addEventListener('online', sync)

    return () => window.removeEventListener('online', sync)
  }, [])

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/app" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
