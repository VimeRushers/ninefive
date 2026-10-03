import { Trophy, Users, UserX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MoneyAmount, Participant } from '@/api/types'
import { StatCard } from '@/components/shared/StatCard'
import { formatMoney, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { priceShare, STATUS_ICON, STATUS_TONE } from './participants'

/** Cards fill the row on wide screens, however many apply to this tender. */
const COLUMNS: Record<number, string> = { 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4' }

/** Key numbers of the competition. The winner and "your result" cards appear only when they apply. */
export function CompetitorKpis({
  participants,
  estimate,
}: {
  participants: Participant[]
  estimate: MoneyAmount | null
}) {
  const { t, i18n } = useTranslation('analyzer')
  const language = i18n.language
  const rejected = participants.filter((p) => p.status === 'rejected').length
  const disqualified = participants.filter((p) => p.status === 'disqualified').length
  const winner = participants.find((p) => p.status === 'winner')
  const winnerShare = winner ? priceShare(winner, estimate) : null
  const us = participants.find((p) => p.is_us)
  const ourShare = us ? priceShare(us, estimate) : null
  const cards = 2 + Number(Boolean(winner)) + Number(Boolean(us))

  return (
    <div className={cn('stagger grid grid-cols-1 gap-3 sm:grid-cols-2', COLUMNS[cards])}>
      <StatCard
        icon={Users}
        tone="accent"
        label={t('kpi.participants')}
        value={participants.length}
        hint={us ? t('kpi.includingYou') : undefined}
      />
      <StatCard
        icon={UserX}
        tone={rejected + disqualified > 0 ? 'warning' : 'neutral'}
        label={t('kpi.rejected')}
        value={rejected + disqualified}
        hint={rejected + disqualified > 0 ? t('kpi.rejectedHint', { rejected, disqualified }) : undefined}
      />
      {winner && (
        <StatCard
          icon={Trophy}
          tone="good"
          label={t('kpi.winningPrice')}
          value={winnerShare === null ? '—' : formatPercent(winnerShare, language)}
          hint={
            winner.bid_price &&
            (estimate
              ? t('kpi.winningPriceHint', {
                  price: formatMoney(winner.bid_price, language),
                  estimate: formatMoney(estimate, language),
                })
              : formatMoney(winner.bid_price, language))
          }
        />
      )}
      {us && (
        <StatCard
          icon={STATUS_ICON[us.status]}
          tone={STATUS_TONE[us.status]}
          tinted
          label={t('kpi.yourResult')}
          value={<span className="text-base font-bold">{t(`result.${us.status}`)}</span>}
          hint={
            ourShare === null ? undefined : t('kpi.yourBid', { percent: formatPercent(ourShare, language) })
          }
        />
      )}
    </div>
  )
}
