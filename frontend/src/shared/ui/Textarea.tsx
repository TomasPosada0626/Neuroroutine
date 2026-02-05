import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({ className, ...props }: Props) {
  return (
    <textarea
      className={cn(
        'min-h-24 w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400',
        className,
      )}
      {...props}
    />
  )
}
