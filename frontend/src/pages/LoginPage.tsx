import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/authStore';
import { loginSchema, type LoginValues } from '@/features/auth/schemas';
import { AuthShell, Button, Card, GoogleMark, Input, PasswordInput } from '@/shared/ui';
import { useUiStore } from '@/shared/state/uiStore';

export function LoginPage() {
  const { session, signInWithPassword, signInWithGoogle } = useAuth();
  const theme = useUiStore((s) => s.theme);
  const isDay = theme === 'day';
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/app';

  const cardClass = isDay
    ? 'mx-auto w-full max-w-md bg-white/70 p-5 ring-1 ring-slate-200'
    : 'mx-auto w-full max-w-md bg-white/5 p-5 ring-1 ring-white/10';
  const googleButtonClass = isDay
    ? 'w-full bg-white ring-1 ring-slate-200 hover:bg-slate-50 focus:ring-cyan-500/25 shadow-sm motion-safe:transition motion-safe:duration-300 hover:-translate-y-0.5'
    : 'w-full bg-white/10 ring-1 ring-white/15 hover:bg-white/15 focus:ring-white/30 motion-safe:transition motion-safe:duration-300 hover:-translate-y-0.5';
  const dividerLineClass = isDay ? 'h-px flex-1 bg-slate-200' : 'h-px flex-1 bg-white/10';
  const dividerTextClass = isDay ? 'text-xs text-slate-500' : 'text-xs text-slate-300';
  const labelClass = isDay
    ? 'text-sm font-medium text-slate-800'
    : 'text-sm font-medium text-slate-200';
  const inputClass =
    'bg-white text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-cyan-500/25';
  const toggleClass = 'text-slate-700 hover:bg-slate-100 focus:ring-cyan-500/25';
  const linkClass = isDay
    ? 'text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-700'
    : 'text-white underline decoration-white/30 underline-offset-4 hover:decoration-white';

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  if (session) return <Navigate to="/app" replace />;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signInWithPassword(values.identifier, values.password);
      navigate(from, { replace: true });
    } catch (e) {
      form.setError('root', { message: e instanceof Error ? e.message : 'Login failed' });
    }
  });

  return (
    <AuthShell
      title="Continúa donde lo dejaste"
      subtitle="Inicia sesión y retoma tu plan: rutinas, tareas y progreso semanal, en un solo lugar."
      badge="Listo para avanzar hoy"
    >
      <Card className={cardClass}>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Button
            type="button"
            variant="secondary"
            className={googleButtonClass}
            onClick={async () => {
              try {
                await signInWithGoogle();
              } catch (e) {
                form.setError('root', {
                  message: e instanceof Error ? e.message : 'Google login failed',
                });
              }
            }}
            aria-label="Continuar con Google"
          >
            <span className="sr-only">Continuar con Google</span>
            <GoogleMark className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3">
            <div className={dividerLineClass} />
            <div className={dividerTextClass}>o</div>
            <div className={dividerLineClass} />
          </div>

          <div className="space-y-1">
            <label className={labelClass} htmlFor="login-identifier">
              Usuario o correo
            </label>
            <Input
              id="login-identifier"
              autoComplete="username"
              aria-label="Usuario o correo"
              data-testid="login-identifier"
              className={inputClass}
              {...form.register('identifier')}
            />
            {form.formState.errors.identifier && (
              <div className="text-xs text-rose-300">
                {form.formState.errors.identifier.message}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className={labelClass} htmlFor="login-password">
                Contraseña
              </label>
              <Link className={'text-xs ' + linkClass} to="/forgot-password">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              aria-label="Contraseña"
              data-testid="login-password"
              className={inputClass}
              toggleClassName={toggleClass}
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
            data-testid="login-submit"
            className="w-full bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 hover:opacity-95 focus:ring-white/30 motion-safe:transition motion-safe:duration-300 hover:-translate-y-0.5"
          >
            Entrar
          </Button>

          <div className={'text-sm ' + (isDay ? 'text-slate-600' : 'text-slate-300')}>
            ¿No tienes cuenta?{' '}
            <Link className={linkClass} to="/register">
              Crear cuenta
            </Link>
          </div>
        </form>
      </Card>
    </AuthShell>
  );
}
