import type { ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui';
import type { DashboardWidgetId } from '../store/dashboardPrefsStore';

type RowProps = {
  id: DashboardWidgetId;
  title: string;
  hidden: boolean;
  isDay: boolean;
  onToggleHidden: () => void;
};

function SortableRow({ id, title, hidden, isDay, onToggleHidden }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between gap-2 rounded-lg p-2 ring-1',
        isDay ? 'bg-white ring-slate-200' : 'bg-white/5 ring-white/10',
        isDragging ? 'opacity-70' : 'opacity-100',
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'grid h-9 w-9 place-items-center rounded-lg text-sm ring-1',
            isDay
              ? 'bg-slate-50 text-slate-700 ring-slate-200'
              : 'bg-white/5 text-slate-200 ring-white/10',
          )}
          title="Arrastra para reordenar"
          aria-label="Arrastra para reordenar"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </div>
        <div className={cn('text-sm font-medium', hidden ? 'opacity-60' : 'opacity-100')}>
          {title}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant={hidden ? 'secondary' : 'danger'} onClick={onToggleHidden}>
          {hidden ? 'Mostrar' : 'Ocultar'}
        </Button>
      </div>
    </div>
  );
}

type Props = {
  isDay: boolean;
  order: DashboardWidgetId[];
  hidden: Record<DashboardWidgetId, boolean>;
  titleForId: (id: DashboardWidgetId) => string;
  onOrderChange: (next: DashboardWidgetId[]) => void;
  onToggleHidden: (id: DashboardWidgetId) => void;
  footer?: ReactNode;
};

export function WidgetOrderEditor({
  isDay,
  order,
  hidden,
  titleForId,
  onOrderChange,
  onToggleHidden,
  footer,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  return (
    <div className="space-y-2">
      <div className={cn('text-xs', isDay ? 'text-slate-600' : 'text-slate-300')}>
        Tip: arrastra (⋮⋮) para reordenar.
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          const { active, over } = event;
          if (!over) return;
          if (active.id === over.id) return;

          const oldIndex = order.indexOf(active.id as DashboardWidgetId);
          const newIndex = order.indexOf(over.id as DashboardWidgetId);
          if (oldIndex === -1 || newIndex === -1) return;

          onOrderChange(arrayMove(order, oldIndex, newIndex) as DashboardWidgetId[]);
        }}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {order.map((id) => (
              <SortableRow
                key={id}
                id={id}
                title={titleForId(id)}
                hidden={hidden[id]}
                isDay={isDay}
                onToggleHidden={() => onToggleHidden(id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {footer ? <div className="pt-2">{footer}</div> : null}
    </div>
  );
}
