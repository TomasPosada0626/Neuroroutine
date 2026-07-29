import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WidgetCardShell } from '../WidgetCardShell';

describe('WidgetCardShell', () => {
  it('renders the title, subtitle, and children when expanded', () => {
    render(
      <WidgetCardShell
        id="today"
        title="Hoy"
        subtitle="Tu foco inmediato"
        collapsed={false}
        onToggleCollapsed={() => {}}
        subtleText="text-slate-600"
      >
        <div>Body content</div>
      </WidgetCardShell>,
    );

    expect(screen.getByText('Hoy')).toBeInTheDocument();
    expect(screen.getByText('Tu foco inmediato')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ocultar/ })).toBeInTheDocument();
  });

  it('hides the body and shows "Mostrar" when collapsed', () => {
    render(
      <WidgetCardShell
        id="today"
        title="Hoy"
        subtitle={null}
        collapsed
        onToggleCollapsed={() => {}}
        subtleText="text-slate-600"
      >
        <div>Body content</div>
      </WidgetCardShell>,
    );

    expect(screen.getByRole('button', { name: /Mostrar/ })).toBeInTheDocument();
    expect(screen.getByText('Body content').parentElement).toHaveClass('hidden');
  });

  it('calls onToggleCollapsed with the widget id when the header is clicked', async () => {
    const user = userEvent.setup();
    const onToggleCollapsed = vi.fn();

    render(
      <WidgetCardShell
        id="streaks"
        title="Rachas"
        subtitle={null}
        collapsed={false}
        onToggleCollapsed={onToggleCollapsed}
        subtleText="text-slate-600"
      >
        <div>Body</div>
      </WidgetCardShell>,
    );

    await user.click(screen.getByRole('button', { name: /Ocultar/ }));
    expect(onToggleCollapsed).toHaveBeenCalledWith('streaks');
  });
});
