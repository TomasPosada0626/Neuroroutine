import { render, screen } from '@testing-library/react';
import { AchievementsWidget } from '../AchievementsWidget';

describe('AchievementsWidget', () => {
  it('marks earned achievements as "Logrado" and the rest as "Pendiente"', () => {
    render(
      <AchievementsWidget
        achievements={[
          { id: 'streak3', title: '3 días seguidos', desc: 'Mantén el impulso.', earned: true },
          { id: 'streak7', title: 'Semana completa', desc: '7 días con actividad.', earned: false },
        ]}
        isDay
        subtleText="text-slate-600"
        panelText="text-slate-700"
        collapsed={false}
        onToggleCollapsed={() => {}}
      />,
    );

    expect(screen.getByText('3 días seguidos')).toBeInTheDocument();
    expect(screen.getByText('Logrado')).toBeInTheDocument();
    expect(screen.getByText('Semana completa')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('renders in the night theme', () => {
    render(
      <AchievementsWidget
        achievements={[
          { id: 'streak3', title: '3 días seguidos', desc: 'Mantén el impulso.', earned: true },
        ]}
        isDay={false}
        subtleText="text-slate-300"
        panelText="text-slate-200"
        collapsed={false}
        onToggleCollapsed={() => {}}
      />,
    );

    expect(screen.getByText('Logrado')).toBeInTheDocument();
  });
});
