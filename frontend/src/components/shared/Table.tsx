import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** Plain data table in the panel style: tinted header row, hairline rows, tabular numbers. */
export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className={cn('w-full border-collapse text-[0.8125rem]', className)} {...props} />
    </div>
  )
}

export function Th({ className, numeric, ...props }: ComponentProps<'th'> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        'bg-surface-2 px-[18px] py-2.5 text-xs font-semibold whitespace-nowrap text-muted-foreground',
        numeric ? 'text-right' : 'text-left',
        className,
      )}
      {...props}
    />
  )
}

export function Tr({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <tr className={cn('border-t transition-colors duration-150 hover:bg-surface-2', className)} {...props} />
  )
}

export function Td({ className, numeric, ...props }: ComponentProps<'td'> & { numeric?: boolean }) {
  return (
    <td
      className={cn('px-[18px] py-2.5 align-middle', numeric && 'text-right tabular-nums', className)}
      {...props}
    />
  )
}
