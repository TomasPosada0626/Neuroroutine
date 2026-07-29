import type { NrSchemaStatus } from '@/shared/schema/schemaService';

type MockResult = { data?: unknown; error?: unknown; throws?: Error };

const supabaseState = vi.hoisted(() => ({
  responses: {} as Record<string, MockResult>,
  calls: [] as { table: string; method: string }[],
}));

function queryBuilder(table: string) {
  let firstMethod: string | null = null;
  const builder: Record<string, unknown> = {
    select: () => {
      firstMethod ??= 'select';
      supabaseState.calls.push({ table, method: 'select' });
      return builder;
    },
    insert: () => {
      firstMethod ??= 'insert';
      supabaseState.calls.push({ table, method: 'insert' });
      return builder;
    },
    update: () => {
      firstMethod ??= 'update';
      supabaseState.calls.push({ table, method: 'update' });
      return builder;
    },
    delete: () => {
      firstMethod ??= 'delete';
      supabaseState.calls.push({ table, method: 'delete' });
      return builder;
    },
    eq: () => builder,
    like: () => builder,
    in: () => builder,
    or: () => builder,
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
      const key = `${table}:${firstMethod}`;
      const res = supabaseState.responses[key] ?? { data: null, error: null };
      if (res.throws) return Promise.reject(res.throws).catch(reject);
      return Promise.resolve({ data: res.data ?? null, error: res.error ?? null }).then(resolve);
    },
  };
  return builder;
}

vi.mock('@/shared/api', () => ({
  supabase: {
    from: (table: string) => queryBuilder(table),
  },
}));

const fetchNrSchemaStatusMock = vi.fn<() => Promise<NrSchemaStatus | null>>();
vi.mock('@/shared/schema/schemaService', () => ({
  fetchNrSchemaStatus: () => fetchNrSchemaStatusMock(),
}));

vi.mock('@/shared/config/appVariant', () => ({
  assertDemoFeature: vi.fn(),
}));

const { clearDashboardDemoData, seedFullDemoData, seedDashboardDemoData } =
  await import('../seedDemoData');

const fullStatus: NrSchemaStatus = {
  version: 9,
  task_metadata: {
    description: true,
    due_date: true,
    due_time: true,
    is_recurring: true,
    recurrence_days_of_week: true,
  },
  has_app_events: true,
  has_rate_limit_table: true,
};

function resetSupabase(overrides: Record<string, MockResult> = {}) {
  supabaseState.responses = {
    'routines:select': { data: [] },
    'routine_tasks:select': { data: [] },
    'app_events:delete': { data: null },
    'routines:delete': { data: null },
    'routines:insert': { data: [] },
    'routine_tasks:insert': { data: [] },
    'routine_tasks:update': { data: null },
    'routine_task_events:insert': { data: null },
    'app_events:insert': { data: null },
    ...overrides,
  };
  supabaseState.calls = [];
}

describe('clearDashboardDemoData', () => {
  beforeEach(() => {
    resetSupabase();
    fetchNrSchemaStatusMock.mockReset().mockResolvedValue(fullStatus);
  });

  it('does nothing when there are no demo routines', async () => {
    await clearDashboardDemoData('u1');

    expect(supabaseState.calls.some((c) => c.table === 'routines' && c.method === 'delete')).toBe(
      false,
    );
  });

  it('throws when listing demo routines fails', async () => {
    resetSupabase({ 'routines:select': { error: new Error('list failed') } });

    await expect(clearDashboardDemoData('u1')).rejects.toThrow('list failed');
  });

  it('deletes app_events (best effort) and the demo routines when found', async () => {
    resetSupabase({
      'routines:select': { data: [{ id: 'r1' }, { id: 'r2' }] },
      'routine_tasks:select': { data: [{ id: 't1' }] },
    });

    await clearDashboardDemoData('u1');

    expect(supabaseState.calls.some((c) => c.table === 'app_events' && c.method === 'delete')).toBe(
      true,
    );
    expect(supabaseState.calls.some((c) => c.table === 'routines' && c.method === 'delete')).toBe(
      true,
    );
  });

  it('throws when deleting the demo routines fails', async () => {
    resetSupabase({
      'routines:select': { data: [{ id: 'r1' }] },
      'routines:delete': { error: new Error('delete failed') },
    });

    await expect(clearDashboardDemoData('u1')).rejects.toThrow('delete failed');
  });

  it('skips the app_events cleanup silently when the schema check throws', async () => {
    resetSupabase({ 'routines:select': { data: [{ id: 'r1' }] } });
    fetchNrSchemaStatusMock.mockRejectedValue(new Error('offline'));

    await expect(clearDashboardDemoData('u1')).resolves.toBeUndefined();
  });

  it('skips the app_events cleanup when the app_events table is not present', async () => {
    resetSupabase({ 'routines:select': { data: [{ id: 'r1' }] } });
    fetchNrSchemaStatusMock.mockResolvedValue({ ...fullStatus, has_app_events: false });

    await clearDashboardDemoData('u1');

    expect(supabaseState.calls.some((c) => c.table === 'app_events' && c.method === 'delete')).toBe(
      false,
    );
  });
});

describe('seedFullDemoData', () => {
  beforeEach(() => {
    resetSupabase();
    fetchNrSchemaStatusMock.mockReset().mockResolvedValue(fullStatus);
  });

  it('throws when creating the demo routines fails', async () => {
    resetSupabase({ 'routines:insert': { error: new Error('insert routines failed') } });

    await expect(seedFullDemoData('u1', 'dashboard')).rejects.toThrow('insert routines failed');
  });

  it('returns early when no routines were created', async () => {
    resetSupabase({ 'routines:insert': { data: [] } });

    await expect(seedFullDemoData('u1', 'dashboard')).resolves.toBeUndefined();
    expect(supabaseState.calls.some((c) => c.table === 'routine_tasks')).toBe(false);
  });

  it('throws when creating the demo tasks fails', async () => {
    resetSupabase({
      'routines:insert': { data: [{ id: 'r1', title: 'Demo: Mañana enfocada' }] },
      'routine_tasks:insert': { error: new Error('insert tasks failed') },
    });

    await expect(seedFullDemoData('u1', 'dashboard')).rejects.toThrow('insert tasks failed');
  });

  it('returns early when no tasks were created', async () => {
    resetSupabase({
      'routines:insert': { data: [{ id: 'r1', title: 'Demo: Mañana enfocada' }] },
      'routine_tasks:insert': { data: [] },
    });

    await expect(seedFullDemoData('u1', 'dashboard')).resolves.toBeUndefined();
    expect(
      supabaseState.calls.some((c) => c.table === 'routine_task_events' && c.method === 'insert'),
    ).toBe(false);
  });

  it('throws when recording completion events fails', async () => {
    resetSupabase({
      'routines:insert': { data: [{ id: 'r1', title: 'Demo: Mañana enfocada' }] },
      'routine_tasks:insert': {
        data: [{ id: 't1', routine_id: 'r1', title: 'Tomar agua (500ml)' }],
      },
      'routine_task_events:insert': { error: new Error('events failed') },
    });

    await expect(seedFullDemoData('u1', 'dashboard')).rejects.toThrow('events failed');
  });

  it('patches supported metadata columns, skips unmatched/empty patches, and logs app_events', async () => {
    resetSupabase({
      'routines:insert': {
        data: [
          { id: 'r1', title: 'Demo: Mañana enfocada' },
          { id: 'r3', title: 'Demo: Estudio (deep work)' },
        ],
      },
      'routine_tasks:insert': {
        data: [
          // Full metadata + completed_at -> patch applies.
          { id: 't1', routine_id: 'r1', title: 'Tomar agua (500ml)' },
          // Known routine/task with no optional fields set -> patch computed empty, skipped.
          { id: 't2', routine_id: 'r3', title: 'Repasar apuntes 15 min' },
          // Title not present in the static task list -> no `desired`, skipped outright.
          { id: 't3', routine_id: 'r1', title: 'Unrecognized task' },
        ],
      },
    });

    await seedFullDemoData('u1', 'dashboard');

    const updateCalls = supabaseState.calls.filter(
      (c) => c.table === 'routine_tasks' && c.method === 'update',
    );
    expect(updateCalls).toHaveLength(1);
    expect(
      supabaseState.calls.some((c) => c.table === 'routine_task_events' && c.method === 'insert'),
    ).toBe(true);
    expect(supabaseState.calls.some((c) => c.table === 'app_events' && c.method === 'insert')).toBe(
      true,
    );
  });

  it('skips app_events logging when the app_events table is unavailable', async () => {
    resetSupabase({
      'routines:insert': { data: [{ id: 'r1', title: 'Demo: Mañana enfocada' }] },
      'routine_tasks:insert': { data: [{ id: 't1', routine_id: 'r1', title: 'Custom' }] },
    });
    fetchNrSchemaStatusMock.mockResolvedValue({ ...fullStatus, has_app_events: false });

    await seedFullDemoData('u1', 'dashboard');

    expect(supabaseState.calls.some((c) => c.table === 'app_events' && c.method === 'insert')).toBe(
      false,
    );
  });

  it('swallows a failure while logging app_events instead of throwing', async () => {
    resetSupabase({
      'routines:insert': { data: [{ id: 'r1', title: 'Demo: Mañana enfocada' }] },
      'routine_tasks:insert': { data: [{ id: 't1', routine_id: 'r1', title: 'Custom' }] },
      'app_events:insert': { throws: new Error('offline') },
    });

    await expect(seedFullDemoData('u1', 'dashboard')).resolves.toBeUndefined();
  });

  it('includes the extended routine/task set for the full scope', async () => {
    resetSupabase({
      'routines:insert': {
        data: [
          { id: 'r1', title: 'Demo: Mañana enfocada' },
          { id: 'r4', title: 'Demo: Noche / Reset' },
        ],
      },
      'routine_tasks:insert': { data: [{ id: 't1', routine_id: 'r4', title: 'Lectura 15 min' }] },
    });
    fetchNrSchemaStatusMock.mockResolvedValue({
      version: 0,
      task_metadata: {
        description: false,
        due_date: false,
        due_time: false,
        is_recurring: false,
        recurrence_days_of_week: false,
      },
      has_app_events: false,
      has_rate_limit_table: false,
    });

    await expect(seedFullDemoData('u1', 'full')).resolves.toBeUndefined();
  });
});

describe('seedDashboardDemoData', () => {
  it('clears existing demo data and reseeds with the dashboard scope', async () => {
    resetSupabase({
      'routines:insert': { data: [{ id: 'r1', title: 'Demo: Mañana enfocada' }] },
      'routine_tasks:insert': { data: [{ id: 't1', routine_id: 'r1', title: 'Custom' }] },
    });
    fetchNrSchemaStatusMock.mockReset().mockResolvedValue(fullStatus);

    await expect(seedDashboardDemoData('u1')).resolves.toBeUndefined();
  });
});
