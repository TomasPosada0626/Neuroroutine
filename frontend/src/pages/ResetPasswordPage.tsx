import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/authStore';
import { resetPasswordSchema, type ResetPasswordValues } from '@/features/auth/schemas';
import { AuthShell, Button, Card, PasswordInput } from '@/shared/ui';
import { useUiStore } from '@/shared/state/uiStore';

export function ResetPasswordPage() {
  const { session, loading, updatePassword } = useAuth();
  const theme = useUiStore((s) => s.theme);
  const isDay = theme === 'day';
  const navigate = useNavigate();

  const cardClass = isDay
    ? 'mx-auto w-full max-w-md bg-white/70 p-5 ring-1 ring-slate-200'
    : 'mx-auto w-full max-w-md bg-white/5 p-5 ring-1 ring-white/10';
  const labelClass = isDay
    ? 'text-sm font-medium text-slate-800'
    : 'text-sm font-medium text-slate-200';
  const inputClass =
    'bg-white text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-cyan-500/25';
  const toggleClass = 'text-slate-700 hover:bg-slate-100 focus:ring-cyan-500/25';
  const linkClass = isDay
    ? 'text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-700'
    : 'text-white underline decoration-white/30 underline-offset-4 hover:decoration-white';

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updatePassword(values.password);
      navigate('/app', { replace: true });
    } catch (e) {
      form.setError('root', {
        message: e instanceof Error ? e.message : 'No se pudo actualizar la contraseña',
      });
    }
  });

  return (
    <AuthShell
      title="Elige una nueva contraseña"
      subtitle="Este enlace solo funciona una vez y expira después de un tiempo."
      badge="Recuperación de cuenta"
    >
      <Card className={cardClass}>
        {loading ? (
          <div className={'text-sm ' + (isDay ? 'text-slate-600' : 'text-slate-300')}>
            Verificando enlace…
          </div>
        ) : !session ? (
          <div className="space-y-4">
            <div className={'text-sm ' + (isDay ? 'text-slate-700' : 'text-slate-200')}>
              Este enlace de recuperación no es válido o ya expiró.
            </div>
            <Link className={linkClass} to="/forgot-password">
              Solicitar un nuevo enlace
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1">
              <label className={labelClass} htmlFor="reset-password-password">
                Nueva contraseña
              </label>
              <PasswordInput
                id="reset-password-password"
                autoComplete="new-password"
                aria-label="Nueva contraseña"
                className={inputClass}
                toggleClassName={toggleClass}
                {...form.register('password')}
              />
              {form.formState.errors.password ? (
                <div className="text-xs text-rose-300">
                  {form.formState.errors.password.message}
                </div>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className={labelClass} htmlFor="reset-password-confirm">
                Confirmar contraseña
              </label>
              <PasswordInput
                id="reset-password-confirm"
                autoComplete="new-password"
                aria-label="Confirmar contraseña"
                className={inputClass}
                toggleClassName={toggleClass}
                {...form.register('confirmPassword')}
              />
              {form.formState.errors.confirmPassword ? (
                <div className="text-xs text-rose-300">
                  {form.formState.errors.confirmPassword.message}
                </div>
              ) : null}
            </div>

            {form.formState.errors.root ? (
              <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200 ring-1 ring-rose-500/20">
                {form.formState.errors.root.message}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 hover:opacity-95 focus:ring-white/30 motion-safe:transition motion-safe:duration-300 hover:-translate-y-0.5"
            >
              Guardar nueva contraseña
            </Button>
          </form>
        )}
      </Card>
    </AuthShell>
  );
}
