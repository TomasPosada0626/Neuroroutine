import type { InputHTMLAttributes } from 'react'
import { useId, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { Input } from './Input'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function PasswordInput({ className, ...props }: Props) {
  const [visible, setVisible] = useState(false)
  const inputId = useId()

  return (
    <div className="relative">
      <Input
        id={props.id ?? inputId}
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn('pr-24', className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
        aria-controls={props.id ?? inputId}
        aria-pressed={visible}
      >
        {visible ? 'Ocultar' : 'Mostrar'}
      </button>
    </div>
  )
}
