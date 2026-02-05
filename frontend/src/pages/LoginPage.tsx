import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/authStore'
import { loginSchema, type LoginValues } from '@/features/auth/schemas'
import { Button, Card, Input, PasswordInput } from '@/shared/ui'

export function LoginPage() {
  const { session, signInWithPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/app'

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  })

  if (session) return <Navigate to="/app" replace />

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signInWithPassword(values.identifier, values.password)
      navigate(from, { replace: true })
    } catch (e) {
      form.setError('root', { message: e instanceof Error ? e.message : 'Login failed' })
    }
  })

  return (
    <div className="min-h-dvh grid place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <div className="text-2xl font-semibold">Bienvenido de vuelta</div>
          <div className="text-sm text-slate-600">Inicia sesión para ver tus rutinas</div>
        </div>

        <Card>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium">Usuario o correo</label>
              <Input autoComplete="username" {...form.register('identifier')} />
              {form.formState.errors.identifier && (
                <div className="text-xs text-rose-600">
                  {form.formState.errors.identifier.message}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Contraseña</label>
              <PasswordInput autoComplete="current-password" {...form.register('password')} />
              {form.formState.errors.password && (
                <div className="text-xs text-rose-600">{form.formState.errors.password.message}</div>
              )}
            </div>

            {form.formState.errors.root && (
              <div className="text-sm text-rose-600">{form.formState.errors.root.message}</div>
            )}

            <Button type="submit" className="w-full">
              Entrar
            </Button>

            <div className="text-sm text-slate-600">
              ¿No tienes cuenta? <Link className="text-slate-900 underline" to="/register">Crear cuenta</Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
