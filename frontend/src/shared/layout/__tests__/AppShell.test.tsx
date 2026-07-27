import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from '../AppShell';

const uiState = vi.hoisted(() => ({ theme: 'night' as 'day' | 'night' }));
vi.mock('@/shared/state/uiStore', () => ({
  useUiStore: (selector: (s: { theme: string; toggleTheme: () => void }) => unknown) =>
    selector({ theme: uiState.theme, toggleTheme: vi.fn() }),
}));

const hydrateFromCache = vi.fn();
const refresh = vi.fn();
vi.mock('@/shared/schema/schemaStore', () => ({
  useSchemaStore: (selector: (s: { hydrateFromCache: () => void; refresh: () => void }) => unknown) =>
    selector({ hydrateFromCache, refresh }),
}));

vi.mock('@/shared/schema/SchemaBanner', () => ({
  SchemaBanner: () => <div data-testid="schema-banner" />,
}));

describe('AppShell', () => {
  beforeEach(() => {
    uiState.theme = 'night';
    hydrateFromCache.mockClear();
    refresh.mockClear();
  });

  it('hydrates the cached schema status on mount', () => {
    render(<AppShell>content</AppShell>);

    expect(hydrateFromCache).toHaveBeenCalledTimes(1);
  });

  it('does not refresh the schema status without a signed-in user', () => {
    render(<AppShell userId={null}>content</AppShell>);

    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes the schema status once a user id is available', () => {
    render(<AppShell userId="u1">content</AppShell>);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('renders the user email, children, and the schema banner', () => {
    render(<AppShell userEmail="tomas@example.com">child content</AppShell>);

    expect(screen.getByText('tomas@example.com')).toBeInTheDocument();
    expect(screen.getByText('child content')).toBeInTheDocument();
    expect(screen.getByTestId('schema-banner')).toBeInTheDocument();
  });

  it('calls onSignOut when the Salir button is clicked', async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn().mockResolvedValue(undefined);
    render(<AppShell onSignOut={onSignOut}>content</AppShell>);

    await user.click(screen.getByRole('button', { name: 'Salir' }));

    expect(onSignOut).toHaveBeenCalled();
  });

  it('does not throw when the Salir button is clicked without an onSignOut handler', async () => {
    const user = userEvent.setup();
    render(<AppShell>content</AppShell>);

    await user.click(screen.getByRole('button', { name: 'Salir' }));
  });

  it('renders with day-theme styling when the theme is day', () => {
    uiState.theme = 'day';
    render(<AppShell>content</AppShell>);

    expect(screen.getByText('NeuroRoutine')).toBeInTheDocument();
  });
});
