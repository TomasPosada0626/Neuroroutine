import { render, screen } from '@testing-library/react';
import type { NrSchemaStatus } from '../schemaService';
import { SchemaBanner } from '../SchemaBanner';

const schemaState = vi.hoisted(() => ({ status: null as NrSchemaStatus | null }));

vi.mock('../schemaStore', () => ({
  useSchemaStore: (selector: (s: { status: NrSchemaStatus | null }) => unknown) =>
    selector({ status: schemaState.status }),
}));

vi.mock('@/shared/state/uiStore', () => ({
  useUiStore: (selector: (s: { theme: 'day' | 'night' }) => unknown) =>
    selector({ theme: 'night' }),
}));

const completeStatus: NrSchemaStatus = {
  version: 6,
  task_metadata: { description: true, due_date: true, due_time: true, is_recurring: true },
  has_app_events: true,
};

describe('SchemaBanner', () => {
  beforeEach(() => {
    schemaState.status = null;
    vi.unstubAllEnvs();
    vi.stubEnv('DEV', true);
  });

  it('renders nothing when there is no schema status yet', () => {
    const { container } = render(<SchemaBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the schema is fully up to date', () => {
    schemaState.status = completeStatus;
    const { container } = render(<SchemaBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('warns about missing optional task metadata columns', () => {
    schemaState.status = {
      ...completeStatus,
      task_metadata: { ...completeStatus.task_metadata, description: false },
    };
    render(<SchemaBanner />);

    expect(
      screen.getByText('Faltan columnas opcionales en `routine_tasks` (descripción/fecha/hora).'),
    ).toBeInTheDocument();
  });

  it('warns about the missing recurring-task migration', () => {
    schemaState.status = {
      ...completeStatus,
      task_metadata: { ...completeStatus.task_metadata, is_recurring: false },
    };
    render(<SchemaBanner />);

    expect(
      screen.getByText('Falta la columna `is_recurring` y el RPC `reset_recurring_tasks` (0006).'),
    ).toBeInTheDocument();
  });

  it('warns about the missing app_events table', () => {
    schemaState.status = { ...completeStatus, has_app_events: false };
    render(<SchemaBanner />);

    expect(screen.getByText('Falta la tabla `app_events` (event log).')).toBeInTheDocument();
  });

  it('can show multiple warnings at once', () => {
    schemaState.status = {
      version: 0,
      task_metadata: { description: false, due_date: false, due_time: false, is_recurring: false },
      has_app_events: false,
    };
    render(<SchemaBanner />);

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('stays hidden outside dev mode even with pending warnings', () => {
    vi.stubEnv('DEV', false);
    schemaState.status = { ...completeStatus, has_app_events: false };

    const { container } = render(<SchemaBanner />);

    expect(container).toBeEmptyDOMElement();
  });
});
