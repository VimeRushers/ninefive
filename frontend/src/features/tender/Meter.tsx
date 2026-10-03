import { cn } from '@/lib/utils'

/** Thin bar for a 0..1 share. Hidden from screen readers: the number next to it says the same. */
export function Meter({ value, className }: { value: number; className?: string }) {
  const width = `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`
  return (
    <div aria-hidden className={cn('h-1.5 overflow-hidden rounded-full bg-surface-3', className)}>
      <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width }} />
    </div>
  )
}
