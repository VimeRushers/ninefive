import { Check, CircleDashed } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { RedFlag } from '@/api/types'
import { Panel, PanelBody, PanelHeader } from '@/components/shared/Panel'
import { TONE_TILE } from '@/lib/tone'
import { cn } from '@/lib/utils'
import { signalStatus } from './signals'

interface NotDetectedListProps {
  flags: RedFlag[]
  /** Spans both columns of the wide layout; otherwise it takes one, next to a signal card. */
  wide: boolean
}

/** Indicators without a signal, listed so the user sees everything that was checked. */
export function NotDetectedList({ flags, wide }: NotDetectedListProps) {
  const { t } = useTranslation('integrity')
  const headingId = useId()

  return (
    <Panel aria-labelledby={headingId} className={cn(wide && 'xl:col-span-2')}>
      <PanelHeader title={<span id={headingId}>{t('notDetected.title')}</span>} />
      <PanelBody>
        <ul className={cn('grid gap-x-8 gap-y-4 md:grid-cols-2', !wide && 'xl:grid-cols-1')}>
          {flags.map((flag) => (
            <NotDetectedItem key={flag.indicator} flag={flag} />
          ))}
        </ul>
      </PanelBody>
    </Panel>
  )
}

function NotDetectedItem({ flag }: { flag: RedFlag }) {
  const { t } = useTranslation('integrity')
  const status = signalStatus(flag)
  const clear = status === 'clear'
  const Icon = clear ? Check : CircleDashed

  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-lg',
          TONE_TILE[clear ? 'good' : 'neutral'],
        )}
      >
        <Icon aria-hidden className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-semibold text-foreground">{t(`indicator.${flag.indicator}.label`)}</span>
          <span className={cn('text-xs font-semibold', clear ? 'text-good-ink' : 'text-muted-foreground')}>
            {t(`status.${status}`)}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t(`indicator.${flag.indicator}.description`)}</p>
      </div>
    </li>
  )
}
