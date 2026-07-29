import { render, screen } from '@testing-library/react';
import { GoalWidget } from '../GoalWidget';
import type { computeWeekCounts } from '@/features/dashboard/utils/dashboardUtils';

function weekCounts(
  overrides: Partial<ReturnType<typeof computeWeekCounts>> = {},
): ReturnType<typeof computeWeekCounts> {
  return {
    startThis: new Date(),
    startPrev: new Date(),
    thisWeekCompleted: 4,
    prevWeekCompleted: 2,
    consistencyThis: 57,
    consistencyPrev: 30,
    deltaPct: 100,
    ...overrides,
  };
}

describe('GoalWidget', () => {
  it('shows progress toward the weekly goal', () => {
    render(
      <GoalWidget
        weeklyGoal={10}
        weekCounts={weekCounts()}
        weeklyProgressPct={40}
        isDay
        subtleText="text-slate-600"
        panelText="text-slate-700"
        collapsed={false}
        onToggleCollapsed={() => {}}
      />,
    );

    expect(screen.getByText('4 / 10')).toBeInTheDocument();
    expect(screen.getByText(/vs anterior: 2/)).toBeInTheDocument();
    expect(screen.getByText('57% de días activos')).toBeInTheDocument();
  });

  it('recommends starting today when nothing is completed this week', () => {
    render(
      <GoalWidget
        weeklyGoal={5}
        weekCounts={weekCounts({
          thisWeekCompleted: 0,
          prevWeekCompleted: 0,
          deltaPct: 0,
          consistencyThis: 0,
        })}
        weeklyProgressPct={0}
        isDay
        subtleText="text-slate-600"
        panelText="text-slate-700"
        collapsed={false}
        onToggleCollapsed={() => {}}
      />,
    );

    expect(screen.getByText('Haz 1 tarea hoy para arrancar.')).toBeInTheDocument();
  });

  it('renders in the night theme', () => {
    render(
      <GoalWidget
        weeklyGoal={10}
        weekCounts={weekCounts()}
        weeklyProgressPct={40}
        isDay={false}
        subtleText="text-slate-300"
        panelText="text-slate-200"
        collapsed={false}
        onToggleCollapsed={() => {}}
      />,
    );

    expect(screen.getByText('Mantén el ritmo con una sesión corta.')).toBeInTheDocument();
  });
});
