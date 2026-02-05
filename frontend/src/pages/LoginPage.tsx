import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/authStore'
import { loginSchema, type LoginValues } from '@/features/auth/schemas'
import { AuthShell, Button, Card, Input, PasswordInput } from '@/shared/ui'

export function LoginPage() {
  const { session, signInWithPassword, signInWithGoogle } = useAuth()
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
    <AuthShell
      title="Bienvenido de vuelta"
      subtitle="Inicia sesión para ver tus rutinas y tu progreso"
      badge="Acceso rápido • Google o usuario/email"
    >
      <Card className="mx-auto w-full max-w-md bg-white/5 p-5 ring-1 ring-white/10">
        <form className="space-y-4" onSubmit={onSubmit}>
          <Button
            type="button"
            variant="secondary"
            className="w-full bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15 focus:ring-white/30 motion-safe:transition motion-safe:duration-300 hover:-translate-y-0.5"
            onClick={async () => {
              try {
                await signInWithGoogle()
              } catch (e) {
                form.setError('root', {
                  message: e instanceof Error ? e.message : 'Google login failed',
                })
              }
            }}
          >
            Continuar con Google
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <div className="text-xs text-slate-300">o</div>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-200">Usuario o correo</label>
            <Input
              autoComplete="username"
              placeholder="tomas / tomas@email.com"
              className="bg-slate-950/40 text-white ring-1 ring-white/10 placeholder:text-slate-400 focus:ring-cyan-400/40"
              {...form.register('identifier')}
            />
            {form.formState.errors.identifier && (
              <div className="text-xs text-rose-300">{form.formState.errors.identifier.message}</div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-200">Contraseña</label>
            <PasswordInput
              autoComplete="current-password"
              className="bg-slate-950/40 text-white ring-1 ring-white/10 placeholder:text-slate-400 focus:ring-cyan-400/40"
              toggleClassName="text-slate-200 hover:bg-white/10 focus:ring-white/30"
              {...form.register('password')}
            />
            {form.formState.errors.password && (
              <div className="text-xs text-rose-300">{form.formState.errors.password.message}</div>
            )}
          </div>

          {form.formState.errors.root && (
            <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200 ring-1 ring-rose-500/20">
              {form.formState.errors.root.message}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 hover:opacity-95 focus:ring-white/30 motion-safe:transition motion-safe:duration-300 hover:-translate-y-0.5"
          >
            Entrar
          </Button>

          <div className="text-sm text-slate-300">
            ¿No tienes cuenta?{' '}
            <Link className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white" to="/register">
              Crear cuenta
            </Link>
          </div>

          <div className="text-xs text-slate-400">
            Serás redirigido a: <span className="text-slate-200">{from}</span>
          </div>
        </form>
      </Card>
    </AuthShell>
  )
}
