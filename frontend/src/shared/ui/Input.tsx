import type { InputHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'
import { useUiStore } from '@/shared/state/uiStore'

type Props = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: Props) {
  const theme = useUiStore((s) => s.theme)
  const isDay = theme === 'day'

  return (
    <input
      className={cn(
        'h-10 w-full rounded-lg px-3 text-sm ring-1 placeholder:text-slate-400 focus:outline-none focus:ring-2',
        isDay
          ? 'bg-white text-slate-900 ring-slate-200 focus:ring-slate-400'
          : 'bg-slate-950/40 text-slate-50 ring-white/10 focus:ring-white/30',
        className,
      )}
      {...props}
    />
  )
}
