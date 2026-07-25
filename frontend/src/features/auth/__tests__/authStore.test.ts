import type { Session, User } from '@supabase/supabase-js';

type MockResult = { data?: unknown; error?: unknown };

const fromResults: Record<string, MockResult[]> = {};

function queueFromResult(table: string, result: MockResult) {
  fromResults[table] = fromResults[table] ?? [];
  fromResults[table].push(result);
}

function nextFromResult(table: string): MockResult {
  return fromResults[table]?.shift() ?? { data: null, error: null };
}

function makeFromChain(table: string) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => nextFromResult(table)),
    upsert: vi.fn(async () => nextFromResult(table)),
    insert: vi.fn(async () => nextFromResult(table)),
  };
  return chain;
}

const authMock = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};

const rpcMock = vi.fn();

vi.mock('@/shared/api', () => ({
  supabase: {
    auth: authMock,
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (table: string) => makeFromChain(table),
  },
}));

const logAppEventMock = vi.fn();
vi.mock('@/shared/observability/eventLog', () => ({
  logAppEvent: (...args: unknown[]) => logAppEventMock(...args),
}));

const { useAuthStore } = await import('../authStore');

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2025-01-01T00:00:00.000Z',
    ...overrides,
  } as User;
}

function fakeSession(user: User): Session {
  return {
    access_token: 'token',
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  } as Session;
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(fromResults)) delete fromResults[key];
  useAuthStore.setState({ loading: true, session: null, user: null });
  authMock.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
});

describe('useAuthStore.init', () => {
  it('hydrates session/user from getSession and syncs the profile', async () => {
    const user = fakeUser();
    const session = fakeSession(user);
    authMock.getSession.mockResolvedValue({ data: { session } });
    queueFromResult('profiles', { data: { username: 'existing' } });

    await useAuthStore.getState().init();

    expect(useAuthStore.getState().session).toBe(session);
    expect(useAuthStore.getState().user).toBe(user);
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('leaves session/user null when there is no active session', async () => {
    authMock.getSession.mockResolvedValue({ data: { session: null } });

    await useAuthStore.getState().init();

    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('does not let a profile-sync failure break auth initialization', async () => {
    const user = fakeUser();
    authMock.getSession.mockResolvedValue({ data: { session: fakeSession(user) } });
    queueFromResult('profiles', { data: null, error: new Error('boom') });
    // maybeSingle() itself never rejects in the real client, but upsert() rejecting is a
    // realistic failure mode (network drop) that init() must swallow rather than throw.
    const chain = makeFromChain('profiles');
    chain.upsert.mockRejectedValueOnce(new Error('network down'));

    await expect(useAuthStore.getState().init()).resolves.toBeInstanceOf(Function);
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('returns an unsubscribe function wired to the auth listener', async () => {
    authMock.getSession.mockResolvedValue({ data: { session: null } });
    const unsubscribe = vi.fn();
    authMock.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });

    const cleanup = await useAuthStore.getState().init();
    cleanup();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('updates session/user and re-syncs the profile when the auth listener fires', async () => {
    authMock.getSession.mockResolvedValue({ data: { session: null } });
    let capturedCallback: ((event: string, session: Session | null) => Promise<void>) | null = null;
    authMock.onAuthStateChange.mockImplementation((cb) => {
      capturedCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    await useAuthStore.getState().init();

    const user = fakeUser();
    const session = fakeSession(user);
    queueFromResult('profiles', { data: { username: 'existing' } });

    await capturedCallback!('SIGNED_IN', session);

    expect(useAuthStore.getState().session).toBe(session);
    expect(useAuthStore.getState().user).toBe(user);
  });

  it('clears session/user when the auth listener fires with no session', async () => {
    authMock.getSession.mockResolvedValue({ data: { session: fakeSession(fakeUser()) } });
    queueFromResult('profiles', { data: { username: 'existing' } });
    let capturedCallback: ((event: string, session: Session | null) => Promise<void>) | null = null;
    authMock.onAuthStateChange.mockImplementation((cb) => {
      capturedCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    await useAuthStore.getState().init();
    await capturedCallback!('SIGNED_OUT', null);

    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe('useAuthStore.signInWithPassword', () => {
  it('signs in directly with an email identifier', async () => {
    const user = fakeUser();
    authMock.signInWithPassword.mockResolvedValue({ data: { user, session: fakeSession(user) } });

    await useAuthStore.getState().signInWithPassword('user@example.com', 'hunter2');

    expect(authMock.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'hunter2',
    });
    expect(rpcMock).not.toHaveBeenCalled();
    expect(logAppEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: user.id, event_name: 'auth_login_success' }),
    );
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('resolves a username to an email via RPC before signing in', async () => {
    rpcMock.mockResolvedValue({ data: 'resolved@example.com', error: null });
    const user = fakeUser({ email: 'resolved@example.com' });
    authMock.signInWithPassword.mockResolvedValue({ data: { user, session: fakeSession(user) } });

    await useAuthStore.getState().signInWithPassword('someusername', 'hunter2');

    expect(rpcMock).toHaveBeenCalledWith('get_email_by_username', { u: 'someusername' });
    expect(authMock.signInWithPassword).toHaveBeenCalledWith({
      email: 'resolved@example.com',
      password: 'hunter2',
    });
  });

  it('throws the RPC error as-is when the username lookup itself fails', async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error('rpc down') });

    await expect(
      useAuthStore.getState().signInWithPassword('someusername', 'hunter2'),
    ).rejects.toThrow('rpc down');
    expect(authMock.signInWithPassword).not.toHaveBeenCalled();
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('runs a dummy sign-in attempt for an unknown username instead of failing fast', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    authMock.signInWithPassword.mockResolvedValue({ data: {}, error: { message: 'no match' } });

    await expect(useAuthStore.getState().signInWithPassword('ghost', 'hunter2')).rejects.toThrow(
      'Usuario o contraseña inválidos',
    );

    // Timing-equalization: a nonexistent username still triggers a real signInWithPassword
    // call against a made-up address, so it can't be distinguished from a real one by speed.
    expect(authMock.signInWithPassword).toHaveBeenCalledTimes(1);
    expect(authMock.signInWithPassword).toHaveBeenCalledWith({
      email: 'ghost@nr-nonexistent.invalid',
      password: 'hunter2',
    });
  });

  it('propagates a real sign-in error from Supabase', async () => {
    authMock.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid login credentials'),
    });

    await expect(
      useAuthStore.getState().signInWithPassword('user@example.com', 'wrong'),
    ).rejects.toThrow('Invalid login credentials');
    expect(logAppEventMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState().loading).toBe(false);
  });
});

describe('useAuthStore.signInWithGoogle', () => {
  it('starts the Google OAuth flow with a redirect back to /app', async () => {
    authMock.signInWithOAuth.mockResolvedValue({ error: null });

    await useAuthStore.getState().signInWithGoogle();

    expect(authMock.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/app` },
    });
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('throws when the OAuth call errors', async () => {
    authMock.signInWithOAuth.mockResolvedValue({ error: new Error('oauth failed') });

    await expect(useAuthStore.getState().signInWithGoogle()).rejects.toThrow('oauth failed');
  });
});

describe('useAuthStore.signUpWithPassword', () => {
  const params = {
    email: 'new@example.com',
    password: 'hunter2hunter2',
    username: 'newuser',
    firstName: 'New',
    lastName: 'User',
  };

  it('reports needsEmailConfirmation=false when signUp returns an active session', async () => {
    const user = fakeUser({ email: params.email });
    authMock.signUp.mockResolvedValue({ data: { user, session: fakeSession(user) } });

    const result = await useAuthStore.getState().signUpWithPassword(params);

    expect(result).toEqual({ needsEmailConfirmation: false });
    expect(authMock.signUp).toHaveBeenCalledWith({
      email: params.email,
      password: params.password,
      options: {
        data: {
          username: params.username,
          first_name: params.firstName,
          last_name: params.lastName,
        },
      },
    });
  });

  it('reports needsEmailConfirmation=true when signUp returns no session', async () => {
    const user = fakeUser({ email: params.email });
    authMock.signUp.mockResolvedValue({ data: { user, session: null } });

    const result = await useAuthStore.getState().signUpWithPassword(params);

    expect(result).toEqual({ needsEmailConfirmation: true });
  });

  it('throws on signUp error without syncing a profile', async () => {
    authMock.signUp.mockResolvedValue({ data: { user: null }, error: new Error('email taken') });

    await expect(useAuthStore.getState().signUpWithPassword(params)).rejects.toThrow('email taken');
    expect(useAuthStore.getState().loading).toBe(false);
  });
});

describe('useAuthStore.signOut', () => {
  it('clears session/user synchronously, before the network call resolves', async () => {
    const user = fakeUser();
    useAuthStore.setState({ session: fakeSession(user), user, loading: false });

    let resolveSignOut!: (value: { error: null }) => void;
    authMock.signOut.mockReturnValue(
      new Promise((resolve) => {
        resolveSignOut = resolve;
      }),
    );

    const signOutPromise = useAuthStore.getState().signOut();

    // This is the regression test for the sign-out race: a caller that navigates away
    // immediately (without awaiting signOut()) must already see a logged-out store, even
    // though the underlying Supabase network call hasn't resolved yet.
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();

    resolveSignOut({ error: null });
    await signOutPromise;

    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('still throws if the network sign-out call errors, after clearing local state', async () => {
    useAuthStore.setState({ session: fakeSession(fakeUser()), user: fakeUser(), loading: false });
    authMock.signOut.mockResolvedValue({ error: new Error('network error') });

    await expect(useAuthStore.getState().signOut()).rejects.toThrow('network error');
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
