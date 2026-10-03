import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** White card with a soft shadow; the main container on every page. */
export function Panel({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'flex min-w-0 animate-panel-in flex-col rounded-2xl border bg-card shadow-panel',
        className,
      )}
      {...props}
    />
  )
}

export function PanelHeader({
  title,
  actions,
  className,
}: {
  title: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex min-h-13 items-center gap-3 px-[18px] pt-4 pb-1', className)}>
      <h2 className="text-[0.9375rem] font-bold text-foreground">{title}</h2>
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </header>
  )
}

export function PanelBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-[18px] pt-2 pb-[18px]', className)} {...props} />
}
