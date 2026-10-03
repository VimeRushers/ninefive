import { Target } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTenderAnalysis } from '@/api/tenders'
import type { WinChanceEstimate } from '@/api/types'
import { DisclaimerBanner } from '@/components/shared/DisclaimerBanner'
import { PanelBody } from '@/components/shared/Panel'
import { QueryState } from '@/components/shared/states'
import { formatPercent, localeFor } from '@/lib/format'
import { Meter } from './Meter'
import { PanelMessage } from './PanelMessage'
import { SectionPanel } from './SectionPanel'

/** Estimated from past tenders only: competitors' bids are not public before bid opening. */
export function WinChancePanel({ tenderId, className }: { tenderId: string; className?: string }) {
  const { t } = useTranslation('tender')
  const query = useTenderAnalysis(tenderId)

  return (
    <SectionPanel title={t('winChance.title')} className={className}>
      <PanelBody>
        <QueryState query={query}>
          {({ win_chance }) =>
            win_chance ? (
              <Estimate estimate={win_chance} />
            ) : (
              <PanelMessage
                icon={Target}
                title={t('winChance.empty.title')}
                description={t('winChance.empty.description')}
              />
            )
          }
        </QueryState>
      </PanelBody>
    </SectionPanel>
  )
}

function Estimate({ estimate }: { estimate: WinChanceEstimate }) {
  const { t, i18n } = useTranslation('tender')
  const language = i18n.language
  const percent = (value: number | null) => (value === null ? null : formatPercent(value, language))
  const bidders =
    estimate.typical_bidder_count === null
      ? null
      : new Intl.NumberFormat(localeFor(language), { maximumFractionDigits: 1 }).format(
          estimate.typical_bidder_count,
        )
  const probability = estimate.estimated_probability

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-[0.8125rem] font-semibold text-ink-2">{t('winChance.probability')}</p>
        {probability === null ? (
          <p className="text-base font-bold">{t('winChance.notEnoughData')}</p>
        ) : (
          <>
            <p className="text-kpi font-extrabold tracking-tight tabular-nums">{percent(probability)}</p>
            <Meter value={probability} className="max-w-sm" />
          </>
        )}
        <p className="text-xs text-muted-foreground">
          {probability === null ? t('winChance.notEnoughDataHint') : t('winChance.probabilityHint')}
        </p>
      </div>
      <dl className="divide-y border-t">
        <Fact label={t('winChance.bidders')} hint={t('winChance.biddersHint')} value={bidders} />
        <Fact
          label={t('winChance.winningPrice')}
          hint={t('winChance.winningPriceHint')}
          value={percent(estimate.typical_winning_ratio)}
        />
        <Fact
          label={t('winChance.concentration')}
          hint={t('winChance.concentrationHint')}
          value={percent(estimate.buyer_concentration)}
        />
      </dl>
      <DisclaimerBanner kind="winChance" />
    </div>
  )
}

/** One number from past tenders, with a line saying what it means. */
function Fact({ label, hint, value }: { label: string; hint: string; value: ReactNode | null }) {
  const { t } = useTranslation('tender')
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 py-3 last:pb-0">
      <dt className="text-sm font-semibold">{label}</dt>
      <dd className="row-span-2 text-right text-sm font-bold whitespace-nowrap tabular-nums">
        {value ?? <span className="font-normal text-faint">{t('winChance.noData')}</span>}
      </dd>
      <dd className="text-xs text-muted-foreground">{hint}</dd>
    </div>
  )
}
