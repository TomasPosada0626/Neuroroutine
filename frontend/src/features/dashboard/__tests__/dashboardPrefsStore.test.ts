import { describe, expect, it, vi } from 'vitest'

async function freshStore() {
  vi.resetModules()
  vi.clearAllMocks()
  const mod = await import('../dashboardPrefsStore')
  return mod
}

describe('useDashboardPrefsStore', () => {
  it('setWidgetOrder filters unknown ids and appends missing defaults', async () => {
    const { useDashboardPrefsStore } = await freshStore()

    const initial = useDashboardPrefsStore.getState().widgetOrder
    expect(initial.length).toBeGreaterThan(0)

    useDashboardPrefsStore.getState().setWidgetOrder(['today', 'unknown' as never, 'goal'] as never)
    const next = useDashboardPrefsStore.getState().widgetOrder

    expect(next[0]).toBe('today')
    expect(next[1]).toBe('goal')
    // Should not contain unknown.
    expect(next.includes('unknown' as never)).toBe(false)
    // Should still contain the default ids.
    for (const id of initial) expect(next).toContain(id)
  })

  it('setWeeklyGoal clamps to a minimum of 1 and persists', async () => {
    const spy = vi.spyOn(window.localStorage.__proto__, 'setItem')
    const { useDashboardPrefsStore } = await freshStore()

    useDashboardPrefsStore.getState().setWeeklyGoal(0)
    expect(useDashboardPrefsStore.getState().weeklyGoal).toBe(1)
    expect(spy).toHaveBeenCalled()
  })
})
