import type { PropsWithChildren, ReactNode } from 'react'
import { useEffect } from 'react'
import { cn } from '@/shared/lib/cn'

type Props = PropsWithChildren<{
  open: boolean
  title?: string
  description?: string
  onClose: () => void
  footer?: ReactNode
  className?: string
}>

export function Modal({ open, title, description, onClose, footer, className, children }: Props) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200',
            className,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || description) && (
            <div className="mb-3">
              {title ? <div className="text-base font-semibold">{title}</div> : null}
              {description ? <div className="text-sm text-slate-600">{description}</div> : null}
            </div>
          )}

          <div>{children}</div>

          {footer ? <div className="mt-4 flex items-center justify-end gap-2">{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}
