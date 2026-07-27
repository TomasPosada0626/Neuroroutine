import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DashboardWidgetId } from '../../store/dashboardPrefsStore';
import { WidgetOrderEditor } from '../WidgetOrderEditor';

type DragEndEvent = { active: { id: string }; over: { id: string } | null };

const dndState = vi.hoisted(() => ({
  onDragEnd: undefined as ((event: DragEndEvent) => void) | undefined,
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: React.ReactNode;
    onDragEnd: (event: DragEndEvent) => void;
  }) => {
    dndState.onDragEnd = onDragEnd;
    return children;
  },
  closestCenter: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => children,
  arrayMove: (array: unknown[], from: number, to: number) => {
    const next = array.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to < 0 ? next.length + to : to, 0, moved);
    return next;
  },
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  verticalListSortingStrategy: {},
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

const order: DashboardWidgetId[] = ['today', 'goal', 'streaks'];
const titles: Record<DashboardWidgetId, string> = {
  today: 'Hoy',
  goal: 'Meta',
  streaks: 'Rachas',
  upcoming: 'Próximas',
  achievements: 'Logros',
  insights: 'Insights',
  analytics: 'Analíticas',
  routines: 'Rutinas',
};

function renderEditor(
  overrides: Partial<React.ComponentProps<typeof WidgetOrderEditor>> = {},
) {
  const onOrderChange = vi.fn();
  const onToggleHidden = vi.fn();

  render(
    <WidgetOrderEditor
      isDay={false}
      order={order}
      hidden={{
        today: false,
        goal: true,
        streaks: false,
        upcoming: false,
        achievements: false,
        insights: false,
        analytics: false,
        routines: false,
      }}
      titleForId={(id) => titles[id]}
      onOrderChange={onOrderChange}
      onToggleHidden={onToggleHidden}
      {...overrides}
    />,
  );

  return { onOrderChange, onToggleHidden };
}

describe('WidgetOrderEditor', () => {
  it('renders each widget row with its title and hide/show label', () => {
    renderEditor();

    expect(screen.getByText('Hoy')).toBeInTheDocument();
    expect(screen.getByText('Meta')).toBeInTheDocument();
    expect(screen.getByText('Rachas')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Mostrar' })).toBeInTheDocument(); // goal is hidden
    expect(screen.getAllByRole('button', { name: 'Ocultar' })).toHaveLength(2);
  });

  it('calls onToggleHidden with the row id when its button is clicked', async () => {
    const user = userEvent.setup();
    const { onToggleHidden } = renderEditor();

    await user.click(screen.getByRole('button', { name: 'Mostrar' }));

    expect(onToggleHidden).toHaveBeenCalledWith('goal');
  });

  it('omits the footer wrapper when no footer is provided', () => {
    renderEditor();

    expect(screen.queryByText('Footer content')).not.toBeInTheDocument();
  });

  it('renders the footer when provided', () => {
    renderEditor({ footer: <div>Footer content</div> });

    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('does nothing when dropped outside a droppable target', () => {
    const { onOrderChange } = renderEditor();

    dndState.onDragEnd?.({ active: { id: 'today' }, over: null });

    expect(onOrderChange).not.toHaveBeenCalled();
  });

  it('does nothing when dropped on itself', () => {
    const { onOrderChange } = renderEditor();

    dndState.onDragEnd?.({ active: { id: 'today' }, over: { id: 'today' } });

    expect(onOrderChange).not.toHaveBeenCalled();
  });

  it('does nothing when active or target id is not part of the current order', () => {
    const { onOrderChange } = renderEditor();

    dndState.onDragEnd?.({ active: { id: 'unknown' }, over: { id: 'goal' } });

    expect(onOrderChange).not.toHaveBeenCalled();
  });

  it('reorders and calls onOrderChange when dropped on a valid target', () => {
    const { onOrderChange } = renderEditor();

    dndState.onDragEnd?.({ active: { id: 'today' }, over: { id: 'streaks' } });

    expect(onOrderChange).toHaveBeenCalledWith(['goal', 'streaks', 'today']);
  });
});
