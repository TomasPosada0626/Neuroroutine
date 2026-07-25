import type { PropsWithChildren } from 'react';
import { cn } from '@/shared/lib/cn';
import { useUiStore } from '@/shared/state/uiStore';

export function Card({ className, children }: PropsWithChildren<{ className?: string }>) {
  const theme = useUiStore((s) => s.theme);
  const isDay = theme === 'day';

  return (
    <div
      className={cn(
        isDay
          ? 'rounded-xl bg-white p-4 text-slate-900 ring-1 ring-slate-200'
          : 'rounded-xl bg-white/5 p-4 text-slate-50 ring-1 ring-white/10',
        className,
      )}
    >
      {children}
    </div>
  );
}
