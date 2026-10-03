import { Landmark, Repeat, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { useBuyerProfile } from '@/api/buyers'
import { PageHeader } from '@/components/shared/PageHeader'
import { Panel, PanelHeader } from '@/components/shared/Panel'
import { StatCard } from '@/components/shared/StatCard'
import { QueryState } from '@/components/shared/states'
import { Table, Td, Th, Tr } from '@/components/shared/Table'
import { formatMoney, formatPercent } from '@/lib/format'

/** Above this share, a rate is shown in the warning color. A signal, not a verdict. */
const NOTABLE_SHARE = 0.4

// TODO (integrity, person 5): history over time, links to the buyer's tenders.
export function BuyerPage() {
  const { buyerId = '' } = useParams()
  const { t, i18n } = useTranslation('integrity')
  const { t: tb } = useTranslation('board')
  const language = i18n.language
  const query = useBuyerProfile(buyerId)
  const percent = (value: number | null) => (value === null ? '—' : formatPercent(value, language))

  return (
    <QueryState query={query}>
      {(buyer) => (
        <div className="space-y-5">
          <PageHeader
            crumbs={[{ label: tb('title'), to: '/board' }]}
            title={buyer.name}
            description={t('buyerTitle')}
          />
          <div className="stagger grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={Landmark}
              tone="accent"
              label={t('buyer.totalTenders')}
              value={buyer.total_tenders}
            />
            <StatCard
              icon={UserRound}
              tone={(buyer.single_bidder_rate ?? 0) >= NOTABLE_SHARE ? 'serious' : 'neutral'}
              label={t('buyer.singleBidderRate')}
              value={percent(buyer.single_bidder_rate)}
            />
            <StatCard
              icon={Repeat}
              tone={(buyer.repeat_winner_concentration ?? 0) >= NOTABLE_SHARE ? 'serious' : 'neutral'}
              label={t('buyer.repeatWinner')}
              value={percent(buyer.repeat_winner_concentration)}
            />
          </div>
          <p className="max-w-prose text-xs text-muted-foreground">{t('note')}</p>

          <Panel>
            <PanelHeader title={t('buyer.topWinners')} />
            <div className="pt-2 pb-3">
              <Table>
                <thead>
                  <tr>
                    <Th>{t('buyer.company')}</Th>
                    <Th numeric>{t('buyer.contracts')}</Th>
                    <Th numeric>{t('buyer.value')}</Th>
                    <Th>{t('buyer.share')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {buyer.top_winners.map((winner) => (
                    <Tr key={winner.idno ?? winner.name}>
                      <Td className="font-semibold">{winner.name}</Td>
                      <Td numeric>{winner.contracts_won}</Td>
                      <Td numeric className="whitespace-nowrap">
                        {formatMoney(winner.total_value, language)}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-28 overflow-hidden rounded-full bg-surface-3">
                            <div
                              className="h-full rounded-full bg-primary transition-[width] duration-500"
                              style={{ width: `${Math.round(winner.share * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {formatPercent(winner.share, language)}
                          </span>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Panel>
        </div>
      )}
    </QueryState>
  )
}
