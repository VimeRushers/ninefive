import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { TONE_CARD, TONE_TILE, type Tone } from '@/lib/tone'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: ReactNode
  icon?: LucideIcon
  tone?: Tone
  /** Tints the whole card, for totals that should stand out. */
  tinted?: boolean
  /** Small line under the value, e.g. the previous period. */
  hint?: ReactNode
  /** Shown next to the value, e.g. a percentage change. */
  aside?: ReactNode
  className?: string
}

/** KPI card: icon tile, label, big number. Put several in a `.stagger` grid. */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
  tinted,
  hint,
  aside,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 animate-panel-in items-start gap-3 rounded-xl border bg-card px-4 py-[15px] shadow-panel',
        tinted && TONE_CARD[tone],
        className,
      )}
    >
      {Icon && (
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', TONE_TILE[tone])}>
          <Icon aria-hidden className="size-4" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[0.8125rem] leading-snug font-semibold text-ink-2">{label}</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
          <span className="min-w-0 text-[1.375rem] leading-tight font-extrabold tracking-tight tabular-nums sm:text-kpi">
            {value}
          </span>
          {aside}
        </p>
        {hint && <p className="mt-0.5 text-xs text-faint">{hint}</p>}
      </div>
    </div>
  )
}
