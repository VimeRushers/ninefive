import { History } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { RedFlag } from '@/api/types'
import { CitedText } from '@/components/shared/CitedText'
import { Panel, PanelBody } from '@/components/shared/Panel'
import { Button } from '@/components/ui/button'
import { TONE_TILE } from '@/lib/tone'
import { cn } from '@/lib/utils'
import { BUYER_INDICATORS, citedEvidence, INDICATOR_ICON } from './signals'

interface SignalCardProps {
  flag: RedFlag
  /** Known once the tender has loaded; buyer signals link to the buyer page. */
  buyerId?: string
}

/**
 * One detected signal: the pattern in plain words and the cited evidence for it.
 * Orange, not red: it is a reason to look closer, not an accusation.
 */
export function SignalCard({ flag, buyerId }: SignalCardProps) {
  const { t } = useTranslation('integrity')
  const headingId = useId()
  const Icon = INDICATOR_ICON[flag.indicator]

  return (
    <Panel aria-labelledby={headingId}>
      <header className="flex items-start gap-3 px-[18px] pt-4">
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', TONE_TILE.serious)}>
          <Icon aria-hidden className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 id={headingId} className="text-[0.9375rem] font-bold text-foreground">
              {t(`indicator.${flag.indicator}.label`)}
            </h2>
            <span className="rounded-md bg-signal-soft px-2 py-0.5 text-xs font-bold text-signal">
              {t('status.detected')}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t(`indicator.${flag.indicator}.description`)}</p>
        </div>
      </header>
      <PanelBody className="flex flex-1 flex-col gap-3 pt-3">
        <div className="rounded-xl bg-surface-2 px-3.5 py-3">
          <h3 className="text-xs font-bold text-ink-2">{t('evidence')}</h3>
          <ul className="mt-2 space-y-3 text-sm leading-relaxed">
            {citedEvidence(flag).map((item, index) => (
              <li key={index}>
                <CitedText item={item} />
              </li>
            ))}
          </ul>
        </div>
        {buyerId && BUYER_INDICATORS.has(flag.indicator) && (
          <Button asChild variant="outline" size="sm" className="mt-auto self-start rounded-lg">
            <Link to={`/buyers/${encodeURIComponent(buyerId)}`}>
              <History aria-hidden />
              {t('buyerHistory')}
            </Link>
          </Button>
        )}
      </PanelBody>
    </Panel>
  )
}
