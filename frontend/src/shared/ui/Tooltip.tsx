import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

type TooltipProps = {
  content: ReactNode
  children: ReactNode
  isDay?: boolean
  disabled?: boolean
  className?: string
}

export function Tooltip({ content, children, isDay = true, disabled, className }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      const el = rootRef.current
      if (!el) return
      if (el.contains(e.target as Node)) return
      setOpen(false)
    }

    window.addEventListener('pointerdown', onPointerDown, { capture: true })
    return () => window.removeEventListener('pointerdown', onPointerDown, { capture: true } as AddEventListenerOptions)
  }, [open])

  if (disabled || content == null || content === '') {
    return <>{children}</>
  }

  return (
    <div
      ref={rootRef}
      className={cn('relative', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onPointerDown={(e) => {
        if (e.pointerType === 'touch' || e.pointerType === 'pen') {
          setOpen((v) => !v)
        }
      }}
      aria-describedby={open ? id : undefined}
    >
      {children}

      {open ? (
        <div
          id={id}
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-1/2 top-0 z-30 min-w-36 max-w-72 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg px-3 py-2 text-xs shadow-lg ring-1',
            isDay ? 'bg-white text-slate-900 ring-slate-200' : 'bg-slate-900 text-slate-100 ring-white/10',
          )}
        >
          {typeof content === 'string' ? <div className="leading-5">{content}</div> : content}
          <div
            className={cn(
              'absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 ring-1',
              isDay ? 'bg-white ring-slate-200' : 'bg-slate-900 ring-white/10',
            )}
          />
        </div>
      ) : null}
    </div>
  )
}
