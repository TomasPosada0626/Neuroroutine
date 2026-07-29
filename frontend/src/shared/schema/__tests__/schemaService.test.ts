const rpcMock = vi.fn();

vi.mock('@/shared/api', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

describe('fetchNrSchemaStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses a full status payload, including is_recurring and recurrence_days_of_week', async () => {
    rpcMock.mockResolvedValue({
      data: {
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
      },
      error: null,
    });

    const { fetchNrSchemaStatus } = await import('../schemaService');
    const status = await fetchNrSchemaStatus();

    expect(rpcMock).toHaveBeenCalledWith('get_nr_schema_status');
    expect(status).toEqual({
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
    });
  });

  it('defaults missing/false fields to false and version to 0', async () => {
    rpcMock.mockResolvedValue({
      data: { task_metadata: {} },
      error: null,
    });

    const { fetchNrSchemaStatus } = await import('../schemaService');
    const status = await fetchNrSchemaStatus();

    expect(status).toEqual({
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
  });

  it('returns null when the RPC errors', async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error('missing function') });

    const { fetchNrSchemaStatus } = await import('../schemaService');
    expect(await fetchNrSchemaStatus()).toBeNull();
  });

  it('returns null when the payload is not a record', async () => {
    rpcMock.mockResolvedValue({ data: 'not-an-object', error: null });

    const { fetchNrSchemaStatus } = await import('../schemaService');
    expect(await fetchNrSchemaStatus()).toBeNull();
  });

  it('returns null when the RPC call throws', async () => {
    rpcMock.mockRejectedValue(new Error('network down'));

    const { fetchNrSchemaStatus } = await import('../schemaService');
    expect(await fetchNrSchemaStatus()).toBeNull();
  });
});
