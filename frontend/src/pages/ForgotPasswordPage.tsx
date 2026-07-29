import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/authStore';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/schemas';
import { AuthShell, Button, Card, Input } from '@/shared/ui';
import { useUiStore } from '@/shared/state/uiStore';

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const theme = useUiStore((s) => s.theme);
  const isDay = theme === 'day';
  const [sent, setSent] = useState(false);

  const cardClass = isDay
    ? 'mx-auto w-full max-w-md bg-white/70 p-5 ring-1 ring-slate-200'
    : 'mx-auto w-full max-w-md bg-white/5 p-5 ring-1 ring-white/10';
  const labelClass = isDay
    ? 'text-sm font-medium text-slate-800'
    : 'text-sm font-medium text-slate-200';
  const inputClass =
    'bg-white text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-cyan-500/25';
  const linkClass = isDay
    ? 'text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-700'
    : 'text-white underline decoration-white/30 underline-offset-4 hover:decoration-white';

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await requestPasswordReset(values.email);
    } catch {
      // Deliberately ignored: showing the same "check your email" outcome regardless of
      // whether the request actually succeeded avoids leaking whether an account exists
      // for that email (Supabase's own resetPasswordForEmail already does this server-side).
    }
    setSent(true);
  });

  return (
    <AuthShell
      title="Recupera tu contraseña"
      subtitle="Te enviamos un enlace para elegir una nueva contraseña."
      badge="Recuperación de cuenta"
    >
      <Card className={cardClass}>
        {sent ? (
          <div className="space-y-4">
            <div className={'text-sm ' + (isDay ? 'text-slate-700' : 'text-slate-200')}>
              Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu
              contraseña. Revisa tu bandeja de entrada (y spam).
            </div>
            <Link className={linkClass} to="/login">
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1">
              <label className={labelClass} htmlFor="forgot-password-email">
                Correo
              </label>
              <Input
                id="forgot-password-email"
                type="email"
                autoComplete="email"
                aria-label="Correo"
                className={inputClass}
                {...form.register('email')}
              />
              {form.formState.errors.email ? (
                <div className="text-xs text-rose-300">{form.formState.errors.email.message}</div>
              ) : null}
            </div>

            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 hover:opacity-95 focus:ring-white/30 motion-safe:transition motion-safe:duration-300 hover:-translate-y-0.5"
            >
              Enviar enlace de recuperación
            </Button>

            <div className={'text-sm ' + (isDay ? 'text-slate-600' : 'text-slate-300')}>
              <Link className={linkClass} to="/login">
                Volver a iniciar sesión
              </Link>
            </div>
          </form>
        )}
      </Card>
    </AuthShell>
  );
}
