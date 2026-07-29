import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/authStore';
import {
  getReminderPreferences,
  upsertReminderPreferences,
} from '@/features/reminders/reminderPreferencesService';
import { Button, Input } from '@/shared/ui';

type Props = {
  isDay: boolean;
  subtleText: string;
};

// Reads/writes the real `reminder_preferences` row `send-due-reminders` actually consumes —
// this is deliberately separate from dashboardPrefsStore's local-only UI prefs, which never
// reached the backend and could make a user believe a reminder was configured when nothing
// server-side had changed.
export function ReminderPreferencesPanel({ isDay, subtleText }: Props) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const [hourDraft, setHourDraft] = useState<number | ''>('');
  const [emailEnabledDraft, setEmailEnabledDraft] = useState(true);
  const [saved, setSaved] = useState(false);

  const query = useQuery({
    queryKey: ['reminder-preferences', userId],
    queryFn: () => getReminderPreferences(userId!),
    enabled: Boolean(userId),
  });

  // Adjust local draft state when fresh data arrives, without a useEffect: React explicitly
  // supports this "reset state when a prop/query result changes" pattern by setting state
  // during render itself (bailing out before committing), rather than syncing via an effect
  // that would cause an extra render pass. See https://react.dev/learn/you-might-not-need-an-effect.
  const [loadedData, setLoadedData] = useState(query.data);
  if (query.data && query.data !== loadedData) {
    setLoadedData(query.data);
    setHourDraft(query.data.reminder_hour);
    setEmailEnabledDraft(query.data.email_enabled);
  }

  const mutation = useMutation({
    mutationFn: (input: { email_enabled: boolean; reminder_hour: number }) =>
      upsertReminderPreferences({ user_id: userId!, ...input }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['reminder-preferences', userId] });
      setHourDraft(data.reminder_hour);
      setEmailEnabledDraft(data.email_enabled);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
    },
  });

  const effectiveHour = query.data?.reminder_hour ?? 8;

  return (
    <div className="sm:col-span-2">
      <div className={'text-xs ' + subtleText}>Recordatorio por email</div>
      <div className={'mt-0.5 text-xs ' + subtleText}>
        Controla si y a qué hora te avisamos por correo sobre tareas vencidas.
      </div>

      {!userId ? null : query.isLoading ? (
        <div className={'mt-2 text-sm ' + subtleText}>Cargando…</div>
      ) : (
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={emailEnabledDraft}
              onChange={(e) => setEmailEnabledDraft(e.target.checked)}
            />
            Recibir recordatorios por email
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              type="number"
              min={0}
              max={23}
              placeholder="0-23"
              aria-label="Hora del recordatorio por email"
              disabled={!emailEnabledDraft}
              value={hourDraft}
              onChange={(e) => {
                const raw = e.target.value.trim();
                setHourDraft(raw === '' ? '' : Math.max(0, Math.min(23, Number(raw))));
              }}
            />
            <Button
              variant="secondary"
              disabled={mutation.isPending || hourDraft === ''}
              onClick={() => {
                if (hourDraft === '') return;
                mutation.mutate({ email_enabled: emailEnabledDraft, reminder_hour: hourDraft });
              }}
            >
              Guardar
            </Button>
            {saved ? (
              <div className={'text-xs ' + (isDay ? 'text-emerald-600' : 'text-emerald-300')}>
                Guardado
              </div>
            ) : null}
            {mutation.isError ? (
              <div className="text-xs text-rose-600">No se pudo guardar. Intenta de nuevo.</div>
            ) : null}
          </div>

          <div className={'text-xs ' + subtleText}>
            Configurado actualmente: {emailEnabledDraft ? 'activado' : 'desactivado'}, hora{' '}
            {String(effectiveHour).padStart(2, '0')}:00.
          </div>
        </div>
      )}
    </div>
  );
}
