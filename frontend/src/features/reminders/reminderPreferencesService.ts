import { supabase } from '@/shared/api';
import type { ReminderPreferences } from './types';

// A user with no row yet is "enabled at hour 8, UTC" — the same defaults the DB columns
// themselves declare, so a never-configured user matches what the backend already assumes.
const DEFAULTS: Omit<ReminderPreferences, 'user_id' | 'updated_at'> = {
  email_enabled: true,
  reminder_hour: 8,
  timezone: 'UTC',
};

export async function getReminderPreferences(userId: string): Promise<ReminderPreferences | null> {
  const { data, error } = await supabase
    .from('reminder_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data as ReminderPreferences;
}

export async function upsertReminderPreferences(input: {
  user_id: string;
  email_enabled?: boolean;
  reminder_hour?: number;
  timezone?: string;
}): Promise<ReminderPreferences> {
  const existing = await getReminderPreferences(input.user_id).catch(() => null);

  const patch = {
    user_id: input.user_id,
    email_enabled: input.email_enabled ?? existing?.email_enabled ?? DEFAULTS.email_enabled,
    reminder_hour: input.reminder_hour ?? existing?.reminder_hour ?? DEFAULTS.reminder_hour,
    timezone: input.timezone ?? existing?.timezone ?? DEFAULTS.timezone,
  };

  const { data, error } = await supabase
    .from('reminder_preferences')
    .upsert(patch, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data as ReminderPreferences;
}
