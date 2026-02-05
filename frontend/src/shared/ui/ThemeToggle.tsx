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

  const iconClass = isDay ? 'text-amber-600' : 'text-slate-300'
  const icon = isDay ? (
    // Sun
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', iconClass)} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm0-16a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm0 18a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1ZM3 11a1 1 0 1 1 0 2H2a1 1 0 1 1 0-2h1Zm20 0a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2h1ZM5.64 4.22a1 1 0 0 1 1.41 0l.71.71a1 1 0 0 1-1.41 1.41l-.71-.7a1 1 0 0 1 0-1.42Zm12.02 12.02a1 1 0 0 1 1.41 0l.71.71a1 1 0 1 1-1.41 1.41l-.71-.71a1 1 0 0 1 0-1.41ZM19.78 4.22a1 1 0 0 1 0 1.41l-.71.71a1 1 0 0 1-1.41-1.41l.71-.71a1 1 0 0 1 1.41 0ZM7.05 17.66a1 1 0 0 1 0 1.41l-.71.71a1 1 0 0 1-1.41-1.41l.71-.71a1 1 0 0 1 1.41 0Z"
      />
    </svg>
  ) : (
    // Moon
    <svg viewBox="0 0 24 24" className={cn('h-4 w-4', iconClass)} aria-hidden="true">
      <path
        fill="currentColor"
        d="M21 14.7A8.3 8.3 0 0 1 9.3 3a1 1 0 0 0-1.2 1.2A10.3 10.3 0 0 0 19.8 15.9 1 1 0 0 0 21 14.7Z"
      />
    </svg>
  )

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(buttonClass, className)}
      aria-pressed={isDay}
      aria-label="Cambiar modo noche/día"
      title="Modo noche/día"
    >
      {icon}
      {!compact ? (
        <span className={labelClass}>
          <span className={isDay ? 'text-slate-600' : 'text-slate-400'}>Tema:</span>{' '}
          {isDay ? 'Día' : 'Noche'}
        </span>
      ) : (
        <span className="sr-only">Tema: {isDay ? 'Día' : 'Noche'}</span>
      )}
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
