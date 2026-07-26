import {
  alreadyNotifiedToday,
  getNotificationPermission,
  notifyDueTasksOnce,
  requestNotificationPermission,
} from '../dueTaskNotifications';

class FakeNotification {
  static permission: NotificationPermission = 'default';
  static requestPermission = vi.fn(async () => FakeNotification.permission);
  static lastInstance: FakeNotification | null = null;

  title: string;
  body?: string;
  tag?: string;

  constructor(title: string, options?: NotificationOptions) {
    this.title = title;
    this.body = options?.body;
    this.tag = options?.tag;
    FakeNotification.lastInstance = this;
  }
}

describe('dueTaskNotifications', () => {
  const originalNotification = (globalThis as { Notification?: unknown }).Notification;

  beforeEach(() => {
    localStorage.clear();
    FakeNotification.permission = 'default';
    FakeNotification.lastInstance = null;
    (globalThis as { Notification?: unknown }).Notification = FakeNotification;
  });

  afterAll(() => {
    (globalThis as { Notification?: unknown }).Notification = originalNotification;
  });

  it('reports "unsupported" when the Notification API does not exist', () => {
    delete (globalThis as { Notification?: unknown }).Notification;
    expect(getNotificationPermission()).toBe('unsupported');
  });

  it('reports the current permission when supported', () => {
    FakeNotification.permission = 'denied';
    expect(getNotificationPermission()).toBe('denied');
  });

  it('requestNotificationPermission resolves to "unsupported" without the API', async () => {
    delete (globalThis as { Notification?: unknown }).Notification;
    await expect(requestNotificationPermission()).resolves.toBe('unsupported');
  });

  it('requestNotificationPermission delegates to Notification.requestPermission', async () => {
    FakeNotification.permission = 'granted';
    await expect(requestNotificationPermission()).resolves.toBe('granted');
    expect(FakeNotification.requestPermission).toHaveBeenCalled();
  });

  it('does nothing when permission is not granted', () => {
    FakeNotification.permission = 'default';
    const fired = notifyDueTasksOnce(
      [{ id: 't1', title: 'Task', due_date: '2026-07-26', is_done: false }],
      '2026-07-26',
    );
    expect(fired).toBe(false);
    expect(FakeNotification.lastInstance).toBeNull();
  });

  it('does nothing when there are no due/overdue pending tasks', () => {
    FakeNotification.permission = 'granted';
    const fired = notifyDueTasksOnce(
      [
        { id: 't1', title: 'Future task', due_date: '2026-08-01', is_done: false },
        { id: 't2', title: 'Done today', due_date: '2026-07-26', is_done: true },
        { id: 't3', title: 'No date', due_date: null, is_done: false },
      ],
      '2026-07-26',
    );
    expect(fired).toBe(false);
  });

  it('fires a single-task notification with the task title as the body', () => {
    FakeNotification.permission = 'granted';
    const fired = notifyDueTasksOnce(
      [{ id: 't1', title: 'Tomar agua', due_date: '2026-07-26', is_done: false }],
      '2026-07-26',
    );
    expect(fired).toBe(true);
    expect(FakeNotification.lastInstance?.body).toBe('Tomar agua');
  });

  it('includes overdue (past due_date) tasks, not just tasks due exactly today', () => {
    FakeNotification.permission = 'granted';
    const fired = notifyDueTasksOnce(
      [{ id: 't1', title: 'Overdue task', due_date: '2026-07-20', is_done: false }],
      '2026-07-26',
    );
    expect(fired).toBe(true);
  });

  it('summarizes multiple due tasks and truncates the list after 3', () => {
    FakeNotification.permission = 'granted';
    const fired = notifyDueTasksOnce(
      [
        { id: 't1', title: 'A', due_date: '2026-07-26', is_done: false },
        { id: 't2', title: 'B', due_date: '2026-07-26', is_done: false },
        { id: 't3', title: 'C', due_date: '2026-07-26', is_done: false },
        { id: 't4', title: 'D', due_date: '2026-07-26', is_done: false },
      ],
      '2026-07-26',
    );
    expect(fired).toBe(true);
    expect(FakeNotification.lastInstance?.body).toBe('4 tareas te esperan hoy: A, B, C…');
  });

  it('only notifies once per local day', () => {
    FakeNotification.permission = 'granted';
    const tasks = [{ id: 't1', title: 'Task', due_date: '2026-07-26', is_done: false }];

    expect(notifyDueTasksOnce(tasks, '2026-07-26')).toBe(true);
    expect(alreadyNotifiedToday('2026-07-26')).toBe(true);
    expect(notifyDueTasksOnce(tasks, '2026-07-26')).toBe(false);
  });

  it('notifies again on a new local day', () => {
    FakeNotification.permission = 'granted';
    const tasks = [{ id: 't1', title: 'Task', due_date: '2026-07-26', is_done: false }];

    expect(notifyDueTasksOnce(tasks, '2026-07-26')).toBe(true);
    expect(notifyDueTasksOnce(tasks, '2026-07-27')).toBe(true);
  });

  it('returns false and does not mark notified when constructing the Notification throws', () => {
    FakeNotification.permission = 'granted';
    class ThrowingNotification extends FakeNotification {
      constructor(title: string, options?: NotificationOptions) {
        super(title, options);
        throw new Error('blocked by browser');
      }
    }
    (globalThis as { Notification?: unknown }).Notification = ThrowingNotification;

    const fired = notifyDueTasksOnce(
      [{ id: 't1', title: 'Task', due_date: '2026-07-26', is_done: false }],
      '2026-07-26',
    );
    expect(fired).toBe(false);
    expect(alreadyNotifiedToday('2026-07-26')).toBe(false);
  });
});
