import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/authStore'
import { registerSchema, type RegisterValues } from '@/features/auth/schemas'
import { AuthShell, Button, Card, Input, PasswordInput } from '@/shared/ui'
import { useUiStore } from '@/shared/state/uiStore'

export function RegisterPage() {
  const { session, signUpWithPassword, signInWithGoogle } = useAuth()
  const theme = useUiStore((s) => s.theme)
  const isDay = theme === 'day'
  const navigate = useNavigate()

  const cardClass = isDay
    ? 'mx-auto w-full max-w-md bg-white/70 p-5 ring-1 ring-slate-200'
    : 'mx-auto w-full max-w-md bg-white/5 p-5 ring-1 ring-white/10'
  const googleButtonClass = isDay
    ? 'w-full bg-slate-900 text-white ring-1 ring-slate-900/15 hover:bg-slate-800 focus:ring-slate-300 motion-safe:transition motion-safe:duration-300 hover:-translate-y-0.5'
    : 'w-full bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15 focus:ring-white/30 motion-safe:transition motion-safe:duration-300 hover:-translate-y-0.5'
  const dividerLineClass = isDay ? 'h-px flex-1 bg-slate-200' : 'h-px flex-1 bg-white/10'
  const dividerTextClass = isDay ? 'text-xs text-slate-500' : 'text-xs text-slate-300'
  const labelClass = isDay ? 'text-sm font-medium text-slate-800' : 'text-sm font-medium text-slate-200'
  const inputClass = isDay
    ? 'bg-white text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-cyan-500/25'
    : 'bg-slate-950/40 text-white ring-1 ring-white/10 placeholder:text-slate-400 focus:ring-cyan-400/40'
  const toggleClass = isDay
    ? 'text-slate-700 hover:bg-slate-900/5 focus:ring-slate-300'
    : 'text-slate-200 hover:bg-white/10 focus:ring-white/30'
  const helperTextClass = isDay ? 'text-xs text-slate-500' : 'text-xs text-slate-400'
  const linkClass = isDay
    ? 'text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-700'
    : 'text-white underline decoration-white/30 underline-offset-4 hover:decoration-white'

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  if (session) return <Navigate to="/app" replace />

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await signUpWithPassword({
        email: values.email,
        password: values.password,
        username: values.username,
        firstName: values.firstName,
        lastName: values.lastName,
      })

      if (result.needsEmailConfirmation) {
        navigate('/login', { replace: true })
        return
      }

      navigate('/app', { replace: true })
    } catch (e) {
      form.setError('root', { message: e instanceof Error ? e.message : 'Registration failed' })
    }
  })

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Tu tablero de rutinas en minutos. Empieza simple, mejora cada día."
      badge="Registro rápido • Perfil con nombre y usuario"
    >
      <Card className={cardClass}>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Button
            type="button"
            variant="secondary"
            className={googleButtonClass}
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
            Registrarme con Google
          </Button>

          <div className="flex items-center gap-3">
            <div className={dividerLineClass} />
            <div className={dividerTextClass}>o</div>
            <div className={dividerLineClass} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className={labelClass}>Nombre</label>
              <Input
                autoComplete="given-name"
                placeholder="Tomás"
                className={inputClass}
                {...form.register('firstName')}
              />
              {form.formState.errors.firstName && (
                <div className="text-xs text-rose-300">{form.formState.errors.firstName.message}</div>
              )}
            </div>

            <div className="space-y-1">
              <label className={labelClass}>Apellidos</label>
              <Input
                autoComplete="family-name"
                placeholder="Posada"
                className={inputClass}
                {...form.register('lastName')}
              />
              {form.formState.errors.lastName && (
                <div className="text-xs text-rose-300">{form.formState.errors.lastName.message}</div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Nombre de usuario</label>
            <Input
              autoComplete="username"
              placeholder="tomasposada"
              className={inputClass}
              {...form.register('username')}
            />
            {form.formState.errors.username && (
              <div className="text-xs text-rose-300">{form.formState.errors.username.message}</div>
            )}
            <div className={helperTextClass}>Lo usarás para iniciar sesión (también puedes usar email).</div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Email</label>
            <Input
              type="email"
              autoComplete="email"
              placeholder="tomas@email.com"
              className={inputClass}
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <div className="text-xs text-rose-300">{form.formState.errors.email.message}</div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className={labelClass}>Contraseña</label>
              <PasswordInput
                autoComplete="new-password"
                className={inputClass}
                toggleClassName={toggleClass}
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <div className="text-xs text-rose-300">{form.formState.errors.password.message}</div>
              )}
            </div>

            <div className="space-y-1">
              <label className={labelClass}>Confirmar</label>
              <PasswordInput
                autoComplete="new-password"
                className={inputClass}
                toggleClassName={toggleClass}
                {...form.register('confirmPassword')}
              />
              {form.formState.errors.confirmPassword && (
                <div className="text-xs text-rose-300">{form.formState.errors.confirmPassword.message}</div>
              )}
            </div>
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
            Crear cuenta
          </Button>

          <div className={"text-sm " + (isDay ? 'text-slate-600' : 'text-slate-300')}>
            ¿Ya tienes cuenta?{' '}
            <Link className={linkClass} to="/login">
              Inicia sesión
            </Link>
          </div>
        </form>
      </Card>
    </AuthShell>
  )
}
