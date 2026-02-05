import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '@/shared/lib/cn'
import { useUiStore } from '@/shared/state/uiStore'

type Props = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger'
  }
>

export function Button({ className, variant = 'primary', ...props }: Props) {
  const theme = useUiStore((s) => s.theme)
  const isDay = theme === 'day'

  const base =
    'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants: Record<NonNullable<Props['variant']>, string> = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: isDay
      ? 'bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50'
      : 'bg-white/10 text-slate-50 ring-1 ring-white/15 hover:bg-white/15 focus:ring-white/30',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
  }

  return <button className={cn(base, variants[variant], className)} {...props} />
}
