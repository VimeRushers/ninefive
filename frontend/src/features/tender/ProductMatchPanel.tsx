import { Package, PackageX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CatalogueMatchCandidate, Language, MoneyAmount, ProductMatch, TenderDetail } from '@/api/types'
import { CitedText } from '@/components/shared/CitedText'
import { PanelBody } from '@/components/shared/Panel'
import { Table, Td, Th, Tr } from '@/components/shared/Table'
import { formatMoney, formatPercent } from '@/lib/format'
import { TONE_TILE } from '@/lib/tone'
import { cn } from '@/lib/utils'
import { PanelMessage } from './PanelMessage'
import { SectionPanel } from './SectionPanel'

/** Below this, the items may differ in something that matters (a model, a size), so check them. */
const CLOSE_MATCH = 0.85

/** Each item the tender asks for next to the closest thing in the company's catalogue. */
export function ProductMatchPanel({ tender, className }: { tender: TenderDetail; className?: string }) {
  const { t } = useTranslation('tender')
  // The tender item is the AI's reading of the documents: without a source it is not shown.
  const matches = tender.product_matches.filter((match) => match.tender_item.citations.length > 0)
  const matched = matches.filter((match) => match.catalogue_item !== null).length

  return (
    <SectionPanel
      title={t('products.title')}
      className={className}
      actions={
        matches.length > 0 && (
          <span className="text-xs font-semibold text-muted-foreground">
            {t('products.matched', { matched, total: matches.length })}
          </span>
        )
      }
    >
      {matches.length === 0 ? (
        <PanelBody>
          <PanelMessage icon={Package} title={t('products.empty')} />
        </PanelBody>
      ) : (
        <div className="pt-2 pb-3">
          <Table>
            <thead>
              <tr>
                <Th>{t('products.tenderItem')}</Th>
                <Th numeric>{t('products.estimatedPrice')}</Th>
                <Th>{t('products.catalogueItem')}</Th>
                <Th numeric>{t('products.ourPrice')}</Th>
                <Th numeric>{t('products.match')}</Th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match, index) => (
                <MatchRow key={index} match={match} tenderLanguage={tender.language} />
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </SectionPanel>
  )
}

function MatchRow({ match, tenderLanguage }: { match: ProductMatch; tenderLanguage: Language }) {
  const { t, i18n } = useTranslation('tender')
  const { tender_item: tenderItem, catalogue_item: item, estimated_unit_price: estimate } = match

  return (
    <Tr>
      {/* Items are quoted from the documents, in the tender's language. */}
      <Td lang={tenderLanguage} className="min-w-64 py-3 align-top">
        <CitedText item={tenderItem} className="font-semibold" />
      </Td>
      <Td numeric className="py-3 align-top whitespace-nowrap">
        {estimate ? formatMoney(estimate, i18n.language) : '—'}
      </Td>
      {item ? (
        <>
          <Td className="min-w-48 py-3 align-top font-semibold">{item.name}</Td>
          <Td numeric className="py-3 align-top whitespace-nowrap">
            {formatMoney(item.price, i18n.language)}
            <PriceDifference price={item.price} estimate={estimate} />
          </Td>
          <Td numeric className="py-3 align-top">
            <MatchBadge item={item} />
          </Td>
        </>
      ) : (
        <Td colSpan={3} className="py-3 align-top">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-warning-soft px-2 py-1 text-xs font-bold text-warning-ink">
            <PackageX aria-hidden className="size-3.5 shrink-0" />
            {t('products.noMatch')}
          </span>
        </Td>
      )}
    </Tr>
  )
}

/** How the company's price compares with the tender's own unit estimate. */
function PriceDifference({ price, estimate }: { price: MoneyAmount; estimate: MoneyAmount | null }) {
  const { t, i18n } = useTranslation('tender')
  if (!estimate || estimate.currency !== price.currency || estimate.amount <= 0) return null

  const difference = price.amount / estimate.amount - 1
  if (Math.abs(difference) < 0.005) {
    return <p className="text-xs font-normal text-muted-foreground">{t('products.sameAsEstimate')}</p>
  }
  const percent = formatPercent(Math.abs(difference), i18n.language)
  // Bids above the estimate are often rejected, so that side gets the warning color.
  return (
    <p className={cn('text-xs font-semibold', difference < 0 ? 'text-good-ink' : 'text-warning-ink')}>
      {difference < 0 ? t('products.belowEstimate', { percent }) : t('products.aboveEstimate', { percent })}
    </p>
  )
}

function MatchBadge({ item }: { item: CatalogueMatchCandidate }) {
  const { i18n } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-xs font-bold tabular-nums',
        TONE_TILE[item.similarity >= CLOSE_MATCH ? 'good' : 'warning'],
      )}
    >
      {formatPercent(item.similarity, i18n.language)}
    </span>
  )
}
