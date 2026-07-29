import { render, screen } from '@testing-library/react';
import { StreaksWidget } from '../StreaksWidget';

describe('StreaksWidget', () => {
  it('shows the current and best streak', () => {
    render(
      <StreaksWidget
        streaks={{ current: 5, best: 12, hasToday: true, todayKey: '2026-07-28' }}
        isDay
        subtleText="text-slate-600"
        collapsed={false}
        onToggleCollapsed={() => {}}
      />,
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Ya sumaste hoy')).toBeInTheDocument();
  });

  it('says the user has not added to the streak yet today', () => {
    render(
      <StreaksWidget
        streaks={{ current: 0, best: 3, hasToday: false, todayKey: '2026-07-28' }}
        isDay={false}
        subtleText="text-slate-300"
        collapsed={false}
        onToggleCollapsed={() => {}}
      />,
    );

    expect(screen.getByText('Aún no sumas hoy')).toBeInTheDocument();
  });
});
