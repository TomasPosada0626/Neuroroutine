type MockResult = { data?: unknown; error?: unknown };

type MockChain = {
  select: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

function makeChain(result: MockResult): MockChain {
  const chain = {
    select: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
  };
  return chain;
}

const fromQueue: MockChain[] = [];

vi.mock('@/shared/api', () => ({
  supabase: {
    from: vi.fn(() => {
      const next = fromQueue.shift();
      if (!next) throw new Error('Missing mocked supabase.from() chain');
      return next;
    }),
  },
}));

import { getReminderPreferences, upsertReminderPreferences } from '../reminderPreferencesService';

describe('reminderPreferencesService', () => {
  beforeEach(() => {
    fromQueue.length = 0;
  });

  it('getReminderPreferences returns null when no row exists yet', async () => {
    fromQueue.push(makeChain({ data: null, error: null }));

    const result = await getReminderPreferences('u1');

    expect(result).toBeNull();
  });

  it('getReminderPreferences returns the row when one exists', async () => {
    const row = {
      user_id: 'u1',
      email_enabled: false,
      reminder_hour: 20,
      timezone: 'America/Bogota',
      updated_at: '2026-07-01T00:00:00.000Z',
    };
    fromQueue.push(makeChain({ data: row, error: null }));

    const result = await getReminderPreferences('u1');

    expect(result).toEqual(row);
  });

  it('getReminderPreferences throws on a real error', async () => {
    fromQueue.push(makeChain({ data: null, error: new Error('RLS denied') }));

    await expect(getReminderPreferences('u1')).rejects.toThrow('RLS denied');
  });

  it('upsertReminderPreferences fills in defaults when no row existed before', async () => {
    const getChain = makeChain({ data: null, error: null });
    const upsertChain = makeChain({
      data: {
        user_id: 'u1',
        email_enabled: true,
        reminder_hour: 7,
        timezone: 'UTC',
        updated_at: '2026-07-01T00:00:00.000Z',
      },
      error: null,
    });
    fromQueue.push(getChain, upsertChain);

    const result = await upsertReminderPreferences({ user_id: 'u1', reminder_hour: 7 });

    expect(upsertChain.upsert).toHaveBeenCalledWith(
      {
        user_id: 'u1',
        email_enabled: true,
        reminder_hour: 7,
        timezone: 'UTC',
      },
      { onConflict: 'user_id' },
    );
    expect(result.reminder_hour).toBe(7);
  });

  it('upsertReminderPreferences preserves existing fields not passed in this call', async () => {
    const existingRow = {
      user_id: 'u1',
      email_enabled: false,
      reminder_hour: 20,
      timezone: 'America/Bogota',
      updated_at: '2026-07-01T00:00:00.000Z',
    };
    const getChain = makeChain({ data: existingRow, error: null });
    const upsertChain = makeChain({
      data: { ...existingRow, reminder_hour: 9 },
      error: null,
    });
    fromQueue.push(getChain, upsertChain);

    await upsertReminderPreferences({ user_id: 'u1', reminder_hour: 9 });

    expect(upsertChain.upsert).toHaveBeenCalledWith(
      {
        user_id: 'u1',
        email_enabled: false,
        reminder_hour: 9,
        timezone: 'America/Bogota',
      },
      { onConflict: 'user_id' },
    );
  });

  it('upsertReminderPreferences still works if reading the existing row fails', async () => {
    fromQueue.push({
      select: vi.fn(() => {
        throw new Error('network down');
      }),
      upsert: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
      single: vi.fn(),
    } as unknown as MockChain);
    const upsertChain = makeChain({
      data: {
        user_id: 'u1',
        email_enabled: true,
        reminder_hour: 8,
        timezone: 'UTC',
        updated_at: '2026-07-01T00:00:00.000Z',
      },
      error: null,
    });
    fromQueue.push(upsertChain);

    const result = await upsertReminderPreferences({ user_id: 'u1' });

    expect(result.reminder_hour).toBe(8);
  });

  it('upsertReminderPreferences throws on a real error', async () => {
    fromQueue.push(makeChain({ data: null, error: null }));
    fromQueue.push(makeChain({ data: null, error: new Error('write denied') }));

    await expect(upsertReminderPreferences({ user_id: 'u1' })).rejects.toThrow('write denied');
  });
});
