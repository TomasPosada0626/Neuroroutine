-- Reminder preferences for daily due-task notifications.

CREATE TABLE IF NOT EXISTS public.reminder_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT false,
  reminder_hour smallint NOT NULL DEFAULT 8,
  timezone text NOT NULL DEFAULT 'UTC',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reminder_hour_range CHECK (reminder_hour BETWEEN 0 AND 23)
);

ALTER TABLE public.reminder_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminder_preferences_select_own" ON public.reminder_preferences;
CREATE POLICY "reminder_preferences_select_own" ON public.reminder_preferences
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reminder_preferences_upsert_own" ON public.reminder_preferences;
CREATE POLICY "reminder_preferences_upsert_own" ON public.reminder_preferences
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reminder_preferences_update_own" ON public.reminder_preferences;
CREATE POLICY "reminder_preferences_update_own" ON public.reminder_preferences
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reminder_preferences_delete_own" ON public.reminder_preferences;
CREATE POLICY "reminder_preferences_delete_own" ON public.reminder_preferences
FOR DELETE USING (auth.uid() = user_id);
