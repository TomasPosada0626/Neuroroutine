import { useUiStore } from '@/shared/state/uiStore'
import { cn } from '@/shared/lib/cn'

type Props = {
  className?: string
  compact?: boolean
}

export function ThemeToggle({ className, compact }: Props) {
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const isDay = theme === 'day'

  const buttonClass = isDay
    ? 'group inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200 hover:bg-slate-900/10 focus:outline-none focus:ring-2 focus:ring-slate-300'
    : 'group inline-flex items-center gap-2 rounded-full bg-white/5 px-2 py-1 text-xs text-slate-200 ring-1 ring-white/10 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30'

  const labelClass = isDay ? 'text-slate-700' : 'text-slate-300'
  const trackClass = isDay
    ? 'relative inline-flex h-5 w-9 items-center rounded-full bg-slate-200 ring-1 ring-slate-300'
    : 'relative inline-flex h-5 w-9 items-center rounded-full bg-slate-950/40 ring-1 ring-white/10'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(buttonClass, className)}
      aria-pressed={isDay}
      aria-label="Cambiar modo noche/día"
    >
      {!compact ? <span className={labelClass}>{isDay ? 'Día' : 'Noche'}</span> : null}
      <span className={trackClass}>
        <span
          className={
            'inline-block h-4 w-4 rounded-full bg-gradient-to-br from-cyan-300 to-violet-400 shadow transition-transform duration-300 ' +
            (isDay ? 'translate-x-4' : 'translate-x-1')
          }
        />
      </span>
    </button>
  )
}
