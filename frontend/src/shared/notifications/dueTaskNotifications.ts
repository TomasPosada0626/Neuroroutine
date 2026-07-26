// Local (client-only) reminders: no server, no push infrastructure. If the browser Notification
// permission has been granted, once per local day we tell the user how many pending tasks are
// due today or earlier. This is a low-effort, honest fallback while real email/push reminders
// (see backend/supabase/functions/send-due-reminders) are still pending a provider integration.

export type NotifiableTask = {
  id: string;
  title: string;
  due_date?: string | null;
  is_done: boolean;
};

const NOTIFIED_KEY_PREFIX = 'nr-due-notified-';

function hasNotificationSupport(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!hasNotificationSupport()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (!hasNotificationSupport()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function dueTasksFor(tasks: NotifiableTask[], todayKey: string): NotifiableTask[] {
  return tasks.filter(
    (t) => !t.is_done && typeof t.due_date === 'string' && t.due_date <= todayKey,
  );
}

// Exported for tests; not meant to be called with a fabricated key by app code.
export function alreadyNotifiedToday(todayKey: string): boolean {
  try {
    return localStorage.getItem(NOTIFIED_KEY_PREFIX + todayKey) === '1';
  } catch {
    return false;
  }
}

function markNotifiedToday(todayKey: string): void {
  try {
    localStorage.setItem(NOTIFIED_KEY_PREFIX + todayKey, '1');
  } catch {
    // ignore
  }
}

// Best-effort, once-per-local-day: shows a single notification summarizing due/overdue tasks.
// Safe to call on every dashboard load — it no-ops after the first successful notification of
// the day, and silently does nothing if permission was never granted.
export function notifyDueTasksOnce(tasks: NotifiableTask[], todayKey: string): boolean {
  if (getNotificationPermission() !== 'granted') return false;
  if (alreadyNotifiedToday(todayKey)) return false;

  const due = dueTasksFor(tasks, todayKey);
  if (due.length === 0) return false;

  const body =
    due.length === 1
      ? due[0]!.title
      : `${due.length} tareas te esperan hoy: ${due
          .slice(0, 3)
          .map((t) => t.title)
          .join(', ')}${due.length > 3 ? '…' : ''}`;

  try {
    new Notification('NeuroRoutine', { body, tag: 'nr-due-tasks' });
  } catch {
    return false;
  }

  markNotifiedToday(todayKey);
  return true;
}
