import { act, renderHook } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import type { Routine } from '@/features/routines/types';
import type { RoutineSchedule } from '../../store/dashboardPrefsStore';

const variantState = vi.hoisted(() => ({ isDemo: true }));
vi.mock('@/shared/config/appVariant', () => ({
  get IS_DEMO_VARIANT() {
    return variantState.isDemo;
  },
}));

const routinesState = vi.hoisted(() => ({ routines: [] as Routine[] }));
vi.mock('@/features/routines/routinesStore', () => ({
  useRoutinesStore: {
    getState: () => ({ routines: routinesState.routines }),
  },
}));

const seedDashboardDemoData = vi.fn();
const seedFullDemoData = vi.fn();
const clearDashboardDemoData = vi.fn();
vi.mock('../../data/seedDemoData', () => ({
  seedDashboardDemoData: (...args: unknown[]) => seedDashboardDemoData(...args),
  seedFullDemoData: (...args: unknown[]) => seedFullDemoData(...args),
  clearDashboardDemoData: (...args: unknown[]) => clearDashboardDemoData(...args),
}));

const { useDashboardDemoSeeding } = await import('../useDashboardDemoSeeding');

function fakeUser(): User {
  return { id: 'u1' } as User;
}

function setup(params: Partial<Parameters<typeof useDashboardDemoSeeding>[0]> = {}) {
  const refreshAll = vi.fn().mockResolvedValue(undefined);
  const setRoutineSchedule = vi.fn();

  const { result } = renderHook(() =>
    useDashboardDemoSeeding({
      user: fakeUser(),
      refreshAll,
      routineScheduleById: {},
      setRoutineSchedule,
      locationSearch: '',
      ...params,
    }),
  );

  return { result, refreshAll, setRoutineSchedule };
}

describe('useDashboardDemoSeeding: showSeedTools', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('is false outside the demo variant regardless of env/search', () => {
    variantState.isDemo = false;
    vi.stubEnv('DEV', true);

    const { result } = setup({ locationSearch: '?seed=1' });

    expect(result.current.showSeedTools).toBe(false);
  });

  it('is true in the demo variant during local dev', () => {
    variantState.isDemo = true;
    vi.stubEnv('DEV', true);

    const { result } = setup();

    expect(result.current.showSeedTools).toBe(true);
  });

  it('requires a ?seed param in the demo variant outside dev', () => {
    variantState.isDemo = true;
    vi.stubEnv('DEV', false);

    const withoutSeed = setup({ locationSearch: '' });
    expect(withoutSeed.result.current.showSeedTools).toBe(false);

    const withSeed = setup({ locationSearch: '?seed=1' });
    expect(withSeed.result.current.showSeedTools).toBe(true);
  });
});

describe('useDashboardDemoSeeding: actions', () => {
  beforeEach(() => {
    variantState.isDemo = true;
    routinesState.routines = [];
    seedDashboardDemoData.mockReset().mockResolvedValue(undefined);
    seedFullDemoData.mockReset().mockResolvedValue(undefined);
    clearDashboardDemoData.mockReset().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('onSeedDemo does nothing without a signed-in user', async () => {
    const { result } = setup({ user: null });

    await act(async () => {
      await result.current.onSeedDemo();
    });

    expect(window.confirm).not.toHaveBeenCalled();
    expect(seedDashboardDemoData).not.toHaveBeenCalled();
  });

  it('onSeedDemo does nothing when the confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { result } = setup();

    await act(async () => {
      await result.current.onSeedDemo();
    });

    expect(seedDashboardDemoData).not.toHaveBeenCalled();
  });

  it('onSeedDemo seeds, refreshes, and applies default schedules for routines without one', async () => {
    routinesState.routines = [
      { id: 'r1', user_id: 'u1', title: 'Demo: Foo', notes: null, created_at: '', updated_at: '' },
    ];
    const { result, refreshAll, setRoutineSchedule } = setup();

    await act(async () => {
      await result.current.onSeedDemo();
    });

    expect(seedDashboardDemoData).toHaveBeenCalledWith('u1');
    expect(refreshAll).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1' }));
    expect(setRoutineSchedule).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({ daysOfWeek: expect.any(Array) }),
    );
    expect(result.current.seedError).toBeNull();
    expect(result.current.seedBusy).toBe(false);
  });

  it('onSeedDemo records an error message when seeding fails', async () => {
    seedDashboardDemoData.mockRejectedValue(new Error('quota exceeded'));
    const { result } = setup();

    await act(async () => {
      await result.current.onSeedDemo();
    });

    expect(result.current.seedError).toBe('quota exceeded');
    expect(result.current.seedBusy).toBe(false);
  });

  it('onSeedDemo falls back to a generic error for a non-Error rejection', async () => {
    seedDashboardDemoData.mockRejectedValue('boom');
    const { result } = setup();

    await act(async () => {
      await result.current.onSeedDemo();
    });

    expect(result.current.seedError).toBe('No se pudo poblar la demo');
  });

  it('onSeedFullDemo does nothing without a signed-in user', async () => {
    const { result } = setup({ user: null });

    await act(async () => {
      await result.current.onSeedFullDemo();
    });

    expect(seedFullDemoData).not.toHaveBeenCalled();
  });

  it('onSeedFullDemo seeds the full dataset and refreshes with the longer window', async () => {
    const { result, refreshAll } = setup();

    await act(async () => {
      await result.current.onSeedFullDemo();
    });

    expect(seedFullDemoData).toHaveBeenCalledWith('u1', 'full');
    expect(refreshAll).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1' }));
  });

  it('onSeedFullDemo records an error message when seeding fails', async () => {
    seedFullDemoData.mockRejectedValue(new Error('network down'));
    const { result } = setup();

    await act(async () => {
      await result.current.onSeedFullDemo();
    });

    expect(result.current.seedError).toBe('network down');
  });

  it('onClearDemo does nothing without a signed-in user', async () => {
    const { result } = setup({ user: null });

    await act(async () => {
      await result.current.onClearDemo();
    });

    expect(clearDashboardDemoData).not.toHaveBeenCalled();
  });

  it('onClearDemo does nothing when the confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { result } = setup();

    await act(async () => {
      await result.current.onClearDemo();
    });

    expect(clearDashboardDemoData).not.toHaveBeenCalled();
  });

  it('onClearDemo clears demo data and refreshes', async () => {
    const { result, refreshAll } = setup();

    await act(async () => {
      await result.current.onClearDemo();
    });

    expect(clearDashboardDemoData).toHaveBeenCalledWith('u1');
    expect(refreshAll).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1' }));
  });

  it('onClearDemo records an error message when clearing fails', async () => {
    clearDashboardDemoData.mockRejectedValue(new Error('rls denied'));
    const { result } = setup();

    await act(async () => {
      await result.current.onClearDemo();
    });

    expect(result.current.seedError).toBe('rls denied');
  });

  it('applyDemoScheduleDefaults is a no-op when a schedule already exists', () => {
    routinesState.routines = [
      { id: 'r1', user_id: 'u1', title: 'Demo: Foo', notes: null, created_at: '', updated_at: '' },
    ];
    const existing: Record<string, RoutineSchedule> = { r1: { daysOfWeek: [1], hour: 8 } };
    const { result, setRoutineSchedule } = setup({ routineScheduleById: existing });

    act(() => {
      result.current.applyDemoScheduleDefaults();
    });

    expect(setRoutineSchedule).not.toHaveBeenCalled();
  });

  it('applyDemoScheduleDefaults is a no-op when there are no routines', () => {
    routinesState.routines = [];
    const { result, setRoutineSchedule } = setup();

    act(() => {
      result.current.applyDemoScheduleDefaults();
    });

    expect(setRoutineSchedule).not.toHaveBeenCalled();
  });

  it('applyDemoScheduleDefaults prefers demo-prefixed routines when present', () => {
    routinesState.routines = [
      {
        id: 'r1',
        user_id: 'u1',
        title: 'Real routine',
        notes: null,
        created_at: '',
        updated_at: '',
      },
      { id: 'r2', user_id: 'u1', title: 'Demo: Foo', notes: null, created_at: '', updated_at: '' },
    ];
    const { result, setRoutineSchedule } = setup();

    act(() => {
      result.current.applyDemoScheduleDefaults();
    });

    expect(setRoutineSchedule).toHaveBeenCalledTimes(1);
    expect(setRoutineSchedule).toHaveBeenCalledWith('r2', expect.anything());
  });
});
