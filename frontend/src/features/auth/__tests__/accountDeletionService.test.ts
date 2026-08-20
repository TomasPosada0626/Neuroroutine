const rpcMock = vi.fn();

vi.mock('@/shared/api', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

const { deleteOwnAccount } = await import('../accountDeletionService');

describe('deleteOwnAccount', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('calls the delete_own_account RPC', async () => {
    rpcMock.mockResolvedValue({ error: null });

    await deleteOwnAccount();

    expect(rpcMock).toHaveBeenCalledWith('delete_own_account');
  });

  it('throws when the RPC returns an error', async () => {
    rpcMock.mockResolvedValue({ error: new Error('Not authenticated') });

    await expect(deleteOwnAccount()).rejects.toThrow('Not authenticated');
  });
});
