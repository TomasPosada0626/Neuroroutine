import type { InputHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

type Props = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: Props) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-lg bg-white px-3 text-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400',
        className,
      )}
      {...props}
    />
  )
}
