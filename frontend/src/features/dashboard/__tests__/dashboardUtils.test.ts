import { describe, expect, it, vi } from 'vitest'
import {
  addDaysLocal,
  computeStreaks,
  computeWeekCounts,
  dateKeyLocal,
  formatTimeAgo,
  startOfWeekLocal,
} from '../dashboardUtils'
import type { RoutineTaskEvent } from '@/features/routines/types'

function isoFromLocal(y: number, m0: number, d: number, hh = 12, mm = 0) {
  return new Date(y, m0, d, hh, mm, 0, 0).toISOString()
}

describe('dashboardUtils', () => {
  it('dateKeyLocal formats yyyy-mm-dd', () => {
    const d = new Date(2025, 0, 3, 10, 0, 0)
    expect(dateKeyLocal(d)).toBe('2025-01-03')
  })

  it('startOfWeekLocal respects Monday start', () => {
    // Wed 2025-01-08
    const d = new Date(2025, 0, 8, 10, 0, 0)
    const start = startOfWeekLocal(d, 1)
    expect(dateKeyLocal(start)).toBe('2025-01-06')
  })

  it('formatTimeAgo returns null for invalid input', () => {
    expect(formatTimeAgo(null)).toBeNull()
    expect(formatTimeAgo('not-a-date')).toBeNull()
  })

  it('formatTimeAgo handles seconds/minutes/hours/days', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 0, 10, 12, 0, 0))

    const now = new Date()

    expect(formatTimeAgo(new Date(now.getTime() - 5_000).toISOString())).toBe('justo ahora')
    expect(formatTimeAgo(new Date(now.getTime() - 15_000).toISOString())).toBe('hace 15s')
    expect(formatTimeAgo(new Date(now.getTime() - 2 * 60_000).toISOString())).toBe('hace 2m')
    expect(formatTimeAgo(new Date(now.getTime() - 3 * 60 * 60_000).toISOString())).toBe('hace 3h')
    expect(formatTimeAgo(new Date(now.getTime() - 3 * 24 * 60 * 60_000).toISOString())).toBe('hace 3d')

    vi.useRealTimers()
  })

  it('computeStreaks returns current/best streaks', () => {
    const today = new Date(2025, 0, 10, 12, 0, 0)

    const dayKeys = new Set<string>([
      dateKeyLocal(addDaysLocal(today, 0)),
      dateKeyLocal(addDaysLocal(today, -1)),
      dateKeyLocal(addDaysLocal(today, -2)),
      // break (missing -3)
      dateKeyLocal(addDaysLocal(today, -4)),
      dateKeyLocal(addDaysLocal(today, -5)),
    ])

    const res = computeStreaks(dayKeys, today)
    expect(res.hasToday).toBe(true)
    expect(res.current).toBe(3)
    expect(res.best).toBe(3)
  })

  it('computeWeekCounts counts this week vs previous week deterministically', () => {
    // Choose a known Wednesday.
    const now = new Date(2025, 0, 8, 12, 0, 0)

    const routineId = 'r1'
    const userId = 'u1'

    let n = 0
    const mkEv = (iso: string): RoutineTaskEvent => ({
      id: `ev-${++n}`,
      user_id: userId,
      routine_id: routineId,
      routine_task_id: 't1',
      event_type: 'completed',
      created_at: iso,
    })

    // weekStartsOn Monday => this week starts 2025-01-06
    const events: RoutineTaskEvent[] = [
      mkEv(isoFromLocal(2025, 0, 6)), // Mon this week
      mkEv(isoFromLocal(2025, 0, 7)), // Tue this week
      mkEv(isoFromLocal(2024, 11, 31)), // prev week (Tue)
    ]

    const res = computeWeekCounts(events, { weekStartsOn: 1, routineId, now })
    expect(dateKeyLocal(res.startThis)).toBe('2025-01-06')
    expect(res.thisWeekCompleted).toBe(2)
    expect(res.prevWeekCompleted).toBe(1)
    expect(Math.round(res.consistencyThis)).toBe(Math.round((2 / 7) * 100))
  })
})
