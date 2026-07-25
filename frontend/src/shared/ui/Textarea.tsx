import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { useUiStore } from '@/shared/state/uiStore';

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: Props) {
  const theme = useUiStore((s) => s.theme);
  const isDay = theme === 'day';

  return (
    <textarea
      className={cn(
        'min-h-24 w-full rounded-lg px-3 py-2 text-sm ring-1 placeholder:text-slate-400 focus:outline-none focus:ring-2',
        isDay
          ? 'bg-white text-slate-900 ring-slate-200 focus:ring-slate-400'
          : 'bg-slate-950/40 text-slate-50 ring-white/10 focus:ring-white/30',
        className,
      )}
      {...props}
    />
  );
}
