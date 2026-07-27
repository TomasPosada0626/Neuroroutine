const insertMock = vi.fn();
const fromMock = vi.fn((table: string) => {
  void table;
  return { insert: insertMock };
});

vi.mock('@/shared/api', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
  },
}));

const { logAppEvent } = await import('../eventLog');

describe('logAppEvent', () => {
  beforeEach(() => {
    fromMock.mockClear();
    insertMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
  });

  it('inserts into app_events with defaults for optional fields', async () => {
    const ok = await logAppEvent({ user_id: 'u1', event_name: 'task_created' });

    expect(ok).toBe(true);
    expect(fromMock).toHaveBeenCalledWith('app_events');
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'u1',
      event_name: 'task_created',
      routine_id: null,
      routine_task_id: null,
      meta: {},
    });
  });

  it('passes through routine/task ids and sanitized meta', async () => {
    await logAppEvent({
      user_id: 'u1',
      event_name: 'task_completed',
      routine_id: 'r1',
      routine_task_id: 't1',
      meta: { duration_ms: 42, flow: 'quick_capture', done: true },
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        routine_id: 'r1',
        routine_task_id: 't1',
        meta: { duration_ms: 42, flow: 'quick_capture', done: true },
      }),
    );
  });

  it('drops keys that look like PII regardless of casing', async () => {
    await logAppEvent({
      user_id: 'u1',
      event_name: 'task_created',
      meta: {
        Title: 'secret task title',
        email: 'a@b.com',
        username: 'bob',
        first_name: 'Bob',
        last_name: 'Smith',
        password: 'hunter2',
        safe_field: 'kept',
      },
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ meta: { safe_field: 'kept' } }),
    );
  });

  it('drops non-finite numbers, empty strings, and strings over 80 chars', async () => {
    await logAppEvent({
      user_id: 'u1',
      event_name: 'task_created',
      meta: {
        not_finite: Number.NaN,
        blank: '   ',
        too_long: 'x'.repeat(81),
        exactly_80: 'y'.repeat(80),
      },
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ meta: { exactly_80: 'y'.repeat(80) } }),
    );
  });

  it('caps sanitized meta at 20 entries', async () => {
    const meta = Object.fromEntries(
      Array.from({ length: 25 }, (_, i) => [`field_${i}`, i]),
    );

    await logAppEvent({ user_id: 'u1', event_name: 'task_created', meta });

    const insertedMeta = insertMock.mock.calls[0]?.[0]?.meta as Record<string, unknown>;
    expect(Object.keys(insertedMeta)).toHaveLength(20);
  });

  it('returns false when the insert reports an error', async () => {
    insertMock.mockResolvedValue({ error: { message: 'RLS violation' } });

    const ok = await logAppEvent({ user_id: 'u1', event_name: 'task_created' });

    expect(ok).toBe(false);
  });

  it('returns false instead of throwing when supabase.from throws', async () => {
    fromMock.mockImplementation(() => {
      throw new Error('offline');
    });

    const ok = await logAppEvent({ user_id: 'u1', event_name: 'task_created' });

    expect(ok).toBe(false);
  });
});
