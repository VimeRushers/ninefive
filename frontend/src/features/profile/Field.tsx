import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Props that tie an input to its label, hint and error. */
export interface ControlProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
}

interface FieldProps {
  id: string
  label: ReactNode
  hint?: ReactNode
  error?: string
  className?: string
  children: (control: ControlProps) => ReactNode
}

/** Label above, the control, then the error, or the hint when there is no error. */
export function Field({ id, label, hint, error, className, children }: FieldProps) {
  const noteId = error || hint ? `${id}-note` : undefined
  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': noteId })}
      <FieldNote id={noteId} hint={hint} error={error} />
    </div>
  )
}

export function FieldNote({ id, hint, error }: { id?: string; hint?: ReactNode; error?: string }) {
  if (error) {
    return (
      <p id={id} className="text-xs font-semibold text-critical-ink">
        {error}
      </p>
    )
  }
  if (!hint) return null
  return (
    <p id={id} className="text-xs text-muted-foreground">
      {hint}
    </p>
  )
}
