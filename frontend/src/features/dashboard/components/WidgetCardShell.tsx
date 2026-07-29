import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Card } from '@/shared/ui';
import type { DashboardWidgetId } from '@/shared/state/dashboardPrefsStore';

type Props = {
  id: DashboardWidgetId;
  title: string;
  subtitle: string | null;
  collapsed: boolean;
  onToggleCollapsed: (id: DashboardWidgetId) => void;
  subtleText: string;
  className?: string;
  children: ReactNode;
};

export function WidgetCardShell({
  id,
  title,
  subtitle,
  collapsed,
  onToggleCollapsed,
  subtleText,
  className,
  children,
}: Props) {
  const headerClass = cn(
    'flex w-full items-center justify-between gap-3 text-left',
    'rounded-lg px-0 py-0',
  );

  return (
    <Card className={cn('overflow-hidden', className)}>
      <button type="button" className={headerClass} onClick={() => onToggleCollapsed(id)}>
        <div className="p-4">
          <div className="text-sm font-semibold">{title}</div>
          {subtitle ? <div className={'text-xs ' + subtleText}>{subtitle}</div> : null}
        </div>
        <div className={'p-4 text-xs ' + subtleText}>{collapsed ? 'Mostrar' : 'Ocultar'}</div>
      </button>

      <div className={cn('px-4 pb-4', collapsed ? 'hidden' : 'block')}>{children}</div>
    </Card>
  );
}
