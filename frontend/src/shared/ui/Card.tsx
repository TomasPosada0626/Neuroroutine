import type { PropsWithChildren } from 'react'
import { cn } from '@/shared/lib/cn'

export function Card({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn('rounded-xl bg-white p-4 ring-1 ring-slate-200', className)}>
      {children}
    </div>
  )
}
