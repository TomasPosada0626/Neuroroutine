import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/authStore'
import { registerSchema, type RegisterValues } from '@/features/auth/schemas'
import { Button, Card, Input, PasswordInput } from '@/shared/ui'

export function RegisterPage() {
  const { session, signUpWithPassword, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

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
    <div className="min-h-dvh grid place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <div className="text-2xl font-semibold">Crear cuenta</div>
          <div className="text-sm text-slate-600">Empieza con una rutina simple hoy</div>
        </div>

        <Card>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
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
              <div className="h-px flex-1 bg-slate-200" />
              <div className="text-xs text-slate-500">o</div>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Nombre</label>
              <Input autoComplete="given-name" {...form.register('firstName')} />
              {form.formState.errors.firstName && (
                <div className="text-xs text-rose-600">{form.formState.errors.firstName.message}</div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Apellidos</label>
              <Input autoComplete="family-name" {...form.register('lastName')} />
              {form.formState.errors.lastName && (
                <div className="text-xs text-rose-600">{form.formState.errors.lastName.message}</div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Nombre de usuario</label>
              <Input autoComplete="username" {...form.register('username')} />
              {form.formState.errors.username && (
                <div className="text-xs text-rose-600">{form.formState.errors.username.message}</div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" autoComplete="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <div className="text-xs text-rose-600">{form.formState.errors.email.message}</div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Contraseña</label>
              <PasswordInput autoComplete="new-password" {...form.register('password')} />
              {form.formState.errors.password && (
                <div className="text-xs text-rose-600">{form.formState.errors.password.message}</div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Confirmar contraseña</label>
              <PasswordInput autoComplete="new-password" {...form.register('confirmPassword')} />
              {form.formState.errors.confirmPassword && (
                <div className="text-xs text-rose-600">
                  {form.formState.errors.confirmPassword.message}
                </div>
              )}
            </div>

            {form.formState.errors.root && (
              <div className="text-sm text-rose-600">{form.formState.errors.root.message}</div>
            )}

            <Button type="submit" className="w-full">
              Crear cuenta
            </Button>

            <div className="text-sm text-slate-600">
              ¿Ya tienes cuenta? <Link className="text-slate-900 underline" to="/login">Inicia sesión</Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
