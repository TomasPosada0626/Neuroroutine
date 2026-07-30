import { render, screen } from '@testing-library/react';
import type { NrSchemaStatus } from '../schemaService';
import { SchemaBanner } from '../SchemaBanner';

const schemaState = vi.hoisted(() => ({
  status: null as NrSchemaStatus | null,
  theme: 'night' as 'day' | 'night',
}));

vi.mock('../schemaStore', () => ({
  useSchemaStore: (selector: (s: { status: NrSchemaStatus | null }) => unknown) =>
    selector({ status: schemaState.status }),
}));

vi.mock('@/shared/state/uiStore', () => ({
  useUiStore: (selector: (s: { theme: 'day' | 'night' }) => unknown) =>
    selector({ theme: schemaState.theme }),
}));

const completeStatus: NrSchemaStatus = {
  version: 9,
  task_metadata: {
    description: true,
    due_date: true,
    due_time: true,
    is_recurring: true,
    recurrence_days_of_week: true,
  },
  has_app_events: true,
  has_rate_limit_table: true,
};

describe('SchemaBanner', () => {
  beforeEach(() => {
    schemaState.status = null;
    schemaState.theme = 'night';
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

  it('warns about missing weekly recurrence days only when daily recurring is present', () => {
    schemaState.status = {
      ...completeStatus,
      task_metadata: { ...completeStatus.task_metadata, recurrence_days_of_week: false },
    };
    render(<SchemaBanner />);

    expect(
      screen.getByText(
        'Falta la columna `recurrence_days_of_week` (0008): la recurrencia semanal no hace nada, solo la diaria.',
      ),
    ).toBeInTheDocument();
  });

  it('does not separately warn about weekly days when is_recurring itself is missing', () => {
    schemaState.status = {
      ...completeStatus,
      task_metadata: {
        ...completeStatus.task_metadata,
        is_recurring: false,
        recurrence_days_of_week: false,
      },
    };
    render(<SchemaBanner />);

    expect(
      screen.queryByText(/Falta la columna `recurrence_days_of_week`/),
    ).not.toBeInTheDocument();
  });

  it('warns about the missing rate limit table', () => {
    schemaState.status = { ...completeStatus, has_rate_limit_table: false };
    render(<SchemaBanner />);

    expect(
      screen.getByText(
        'Falta la tabla `rpc_rate_limits` (0007): `get_email_by_username` no tiene límite de tasa activo.',
      ),
    ).toBeInTheDocument();
  });

  it('can show multiple warnings at once', () => {
    schemaState.status = {
      version: 0,
      task_metadata: {
        description: false,
        due_date: false,
        due_time: false,
        is_recurring: false,
        recurrence_days_of_week: false,
      },
      has_app_events: false,
      has_rate_limit_table: false,
    };
    render(<SchemaBanner />);

    // description/date/time (1) + is_recurring (1) + app_events (1) + rate_limit_table (1).
    // recurrence_days_of_week is suppressed here since is_recurring itself is already false.
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('warns with day-theme styling', () => {
    schemaState.theme = 'day';
    schemaState.status = { ...completeStatus, has_app_events: false };
    render(<SchemaBanner />);

    expect(screen.getByText('Falta la tabla `app_events` (event log).')).toBeInTheDocument();
  });

  it('stays hidden outside dev mode even with pending warnings', () => {
    vi.stubEnv('DEV', false);
    schemaState.status = { ...completeStatus, has_app_events: false };

    const { container } = render(<SchemaBanner />);

    expect(container).toBeEmptyDOMElement();
  });
});
