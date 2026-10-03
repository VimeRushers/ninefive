import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Panel } from '@/components/shared/Panel'
import { TONE_TILE } from '@/lib/tone'
import { cn } from '@/lib/utils'

interface SignalSummaryProps {
  found: number
  checked: number
  className?: string
}

/** How many indicators found a signal, next to the reminder that a signal is not proof. */
export function SignalSummary({ found, checked, className }: SignalSummaryProps) {
  const { t } = useTranslation('integrity')
  const Icon = found > 0 ? ShieldAlert : ShieldCheck

  return (
    <Panel className={className}>
      <div className="flex flex-col gap-4 p-[18px] sm:flex-row sm:items-start">
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-xl',
            TONE_TILE[found > 0 ? 'serious' : 'good'],
          )}
        >
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-foreground">
            {found > 0
              ? t('summary.found', { count: found, total: checked })
              : t('summary.none', { total: checked })}
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">{t('note')}</p>
        </div>
        <SignalMeter found={found} checked={checked} />
      </div>
    </Panel>
  )
}

/** One bar per indicator checked, so "5 of 6" reads at a glance. The heading says it in words. */
function SignalMeter({ found, checked }: { found: number; checked: number }) {
  return (
    <div aria-hidden className="flex shrink-0 gap-1 sm:pt-2">
      {Array.from({ length: checked }, (_, index) => (
        <span
          key={index}
          className={cn('h-1.5 w-5 rounded-full', index < found ? 'bg-signal' : 'bg-surface-3')}
        />
      ))}
    </div>
  )
}
