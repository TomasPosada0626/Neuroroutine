// push_enabled exists as a column on reminder_preferences but isn't exposed here: there's no
// push-notification implementation to back it (see ROADMAP.md), so surfacing it in the type
// would let callers read/write a setting that has no effect on anything. Add it back once Web
// Push is actually built.
export type ReminderPreferences = {
  user_id: string;
  email_enabled: boolean;
  reminder_hour: number;
  timezone: string;
  updated_at: string;
};
