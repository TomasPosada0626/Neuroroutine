import type { PropsWithChildren, ReactNode } from 'react'
import { useEffect } from 'react'
import { cn } from '@/shared/lib/cn'
import { useUiStore } from '@/shared/state/uiStore'

type Props = PropsWithChildren<{
  open: boolean
  title?: string
  description?: string
  onClose: () => void
  footer?: ReactNode
  className?: string
}>

export function Modal({ open, title, description, onClose, footer, className, children }: Props) {
  const theme = useUiStore((s) => s.theme)
  const isDay = theme === 'day'

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const dialogBase = isDay
    ? 'bg-white text-slate-900 ring-slate-200'
    : 'bg-slate-950 text-slate-50 ring-white/10'

  const descriptionClass = isDay ? 'text-slate-600' : 'text-slate-300'

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'w-full max-w-lg rounded-2xl p-4 shadow-xl ring-1',
            dialogBase,
            className,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || description) && (
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                {title ? <div className="text-base font-semibold">{title}</div> : null}
                {description ? <div className={cn('text-sm', descriptionClass)}>{description}</div> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                title="Cerrar"
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-lg text-lg leading-none ring-1 transition',
                  isDay
                    ? 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                    : 'bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10',
                )}
              >
                ×
              </button>
            </div>
          )}

          <div>{children}</div>

          {footer ? <div className="mt-4 flex items-center justify-end gap-2">{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}
