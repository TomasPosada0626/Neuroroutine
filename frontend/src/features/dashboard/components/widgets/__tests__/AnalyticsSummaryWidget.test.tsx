import { render, screen } from '@testing-library/react';
import { AnalyticsSummaryWidget } from '../AnalyticsSummaryWidget';

const heatmap = {
  counts: [
    { key: '2026-07-26', date: new Date(2026, 6, 26), count: 2, inRange: true },
    { key: '2026-07-27', date: new Date(2026, 6, 27), count: 0, inRange: true },
    { key: '2026-07-28', date: new Date(2026, 6, 28), count: 3, inRange: true },
  ],
  max: 3,
  streak: 1,
  best: 4,
  source: 'events' as const,
};

describe('AnalyticsSummaryWidget', () => {
  it('shows a loading skeleton while data is loading', () => {
    render(
      <AnalyticsSummaryWidget
        loading
        heatmap={heatmap}
        isDay
        subtleText="text-slate-600"
        collapsed={false}
        onToggleCollapsed={() => {}}
      />,
    );

    expect(screen.queryByText('Checks (rango)')).not.toBeInTheDocument();
  });

  it('summarizes checks, active days, and streaks from the heatmap', () => {
    render(
      <AnalyticsSummaryWidget
        loading={false}
        heatmap={heatmap}
        isDay
        subtleText="text-slate-600"
        collapsed={false}
        onToggleCollapsed={() => {}}
      />,
    );

    expect(screen.getByText('5')).toBeInTheDocument(); // totalChecks: 2 + 0 + 3
    expect(screen.getByText('2')).toBeInTheDocument(); // activeDays: two days with count > 0
    expect(screen.getByText('1d')).toBeInTheDocument(); // streak
    expect(screen.getByText('4d')).toBeInTheDocument(); // best
  });

  it('ignores out-of-range days when totaling checks, and renders in the night theme', () => {
    render(
      <AnalyticsSummaryWidget
        loading={false}
        heatmap={{
          ...heatmap,
          counts: [
            ...heatmap.counts,
            { key: '2026-07-25', date: new Date(2026, 6, 25), count: 99, inRange: false },
          ],
        }}
        isDay={false}
        subtleText="text-slate-300"
        collapsed={false}
        onToggleCollapsed={() => {}}
      />,
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
