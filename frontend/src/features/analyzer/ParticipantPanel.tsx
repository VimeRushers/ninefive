import { CircleMinus, CirclePlus, FileText, type LucideIcon } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { CitedText as CitedTextData, MoneyAmount, Participant, TenderDocument } from '@/api/types'
import { CitedText } from '@/components/shared/CitedText'
import { Panel, PanelBody } from '@/components/shared/Panel'
import { formatMoney, formatPercent } from '@/lib/format'
import { TONE_TILE, type Tone } from '@/lib/tone'
import { cn } from '@/lib/utils'
import { isCited, priceShare, withCitations } from './participants'
import { StatusBadge } from './StatusBadge'

interface ParticipantPanelProps {
  participant: Participant
  estimate: MoneyAmount | null
  /** This participant's files, already matched against the tender's documents. */
  documents: TenderDocument[]
}

/** One bid: its outcome and price, why it was turned down, and what its documents did well or less well. */
export function ParticipantPanel({ participant, estimate, documents }: ParticipantPanelProps) {
  const { t } = useTranslation('analyzer')
  const nameId = useId()
  const youId = useId()
  const reason = isCited(participant.rejection_reason) ? participant.rejection_reason : null

  return (
    <Panel
      // The region is named "<company> You" for the company's own bid, so it stands out when navigating.
      aria-labelledby={participant.is_us ? `${nameId} ${youId}` : nameId}
      className={cn('@container', participant.is_us && 'border-primary/35')}
    >
      <header className="flex flex-wrap items-start gap-x-3 gap-y-1.5 px-[18px] pt-4 pb-1">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.9375rem] font-bold text-foreground">
            <span id={nameId}>{participant.name}</span>
            {participant.is_us && (
              <span id={youId} className={cn('rounded-full px-2 py-px text-2xs font-bold', TONE_TILE.accent)}>
                {t('participant.you')}
              </span>
            )}
          </h3>
          {participant.idno && (
            <p className="mt-0.5 text-xs text-faint tabular-nums">
              {t('participant.idno', { idno: participant.idno })}
            </p>
          )}
        </div>
        <StatusBadge status={participant.status} className="ml-auto" />
      </header>

      <PanelBody className="grid gap-5 pt-3 @3xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <div className="space-y-5">
          <BidFacts participant={participant} estimate={estimate} />
          <DocumentLinks documents={documents} />
        </div>
        <div className="space-y-4">
          {reason && <ReasonBox reason={reason} disqualified={participant.status === 'disqualified'} />}
          <div className="grid gap-4 @xl:grid-cols-2">
            <ClaimList
              title={t('participant.strengths')}
              items={participant.strengths}
              icon={CirclePlus}
              tone="good"
            />
            <ClaimList
              title={t('participant.weaknesses')}
              items={participant.weaknesses}
              icon={CircleMinus}
              tone="warning"
            />
          </div>
        </div>
      </PanelBody>
    </Panel>
  )
}

/** Bid price, its share of the estimate and a bar, so bids compare at a glance across panels. */
function BidFacts({ participant, estimate }: { participant: Participant; estimate: MoneyAmount | null }) {
  const { t, i18n } = useTranslation('analyzer')
  const share = priceShare(participant, estimate)

  return (
    <dl>
      <dt className="text-xs font-semibold text-ink-2">{t('participant.bidPrice')}</dt>
      <dd className="mt-0.5 text-lg font-extrabold tracking-tight tabular-nums">
        {participant.bid_price ? formatMoney(participant.bid_price, i18n.language) : '—'}
      </dd>
      {share !== null && (
        <dd className="mt-1 text-xs text-muted-foreground">
          {t('participant.share', { percent: formatPercent(share, i18n.language) })}
          <span aria-hidden className="mt-1.5 block h-1.5 max-w-56 overflow-hidden rounded-full bg-surface-3">
            <span
              className={cn('block h-full rounded-full', share > 1 ? 'bg-warning' : 'bg-primary')}
              style={{ width: `${Math.min(share, 1) * 100}%` }}
            />
          </span>
        </dd>
      )}
    </dl>
  )
}

/** The reason as the documents give it, in a quiet box: it informs, it doesn't accuse. */
function ReasonBox({ reason, disqualified }: { reason: CitedTextData; disqualified: boolean }) {
  const { t } = useTranslation('analyzer')
  return (
    <div className="rounded-xl border border-l-[3px] border-l-warning bg-surface-2 px-3.5 py-3">
      <h4 className="text-xs font-bold text-ink-2">
        {disqualified ? t('participant.disqualifiedReason') : t('participant.rejectedReason')}
      </h4>
      <CitedText item={reason} className="mt-1.5 text-sm leading-relaxed" />
    </div>
  )
}

interface ClaimListProps {
  title: string
  items: CitedTextData[]
  icon: LucideIcon
  tone: Tone
}

function ClaimList({ title, items, icon: Icon, tone }: ClaimListProps) {
  const { t } = useTranslation('analyzer')
  const shown = withCitations(items)
  return (
    <div className="min-w-0">
      <h4 className="flex items-center gap-1.5 text-xs font-bold text-ink-2">
        <span aria-hidden className={cn('grid size-5 place-items-center rounded-md', TONE_TILE[tone])}>
          <Icon className="size-3.5" />
        </span>
        {title}
      </h4>
      {shown.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t('participant.nothingNoted')}</p>
      ) : (
        <ul className="mt-2 space-y-3 text-sm leading-relaxed">
          {shown.map((item, index) => (
            <li key={index}>
              <CitedText item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DocumentLinks({ documents }: { documents: TenderDocument[] }) {
  const { t } = useTranslation('analyzer')
  return (
    <div>
      <h4 className="text-xs font-bold text-ink-2">{t('participant.documents')}</h4>
      {documents.length === 0 ? (
        <p className="mt-1.5 text-sm text-muted-foreground">{t('participant.noDocuments')}</p>
      ) : (
        <ul className="mt-1.5 space-y-2">
          {documents.map((document) => {
            const analyzing = document.analysis_status === 'analyzing'
            return (
              <li key={document.document_id} className="text-sm leading-snug">
                <a
                  href={document.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-start gap-1.5 rounded-sm font-semibold text-foreground underline-offset-2 transition-colors hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <FileText aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span lang={document.language ?? undefined} className="min-w-0 break-words">
                    {document.title}
                  </span>
                  {/* The space keeps the title and the hint apart in the link's spoken name. */}{' '}
                  <span className="sr-only">{t('participant.newTab')}</span>
                </a>
                {(document.page_count !== null || analyzing) && (
                  <span className="mt-0.5 flex flex-wrap items-center gap-2 pl-5 text-xs text-faint">
                    {document.page_count !== null && (
                      <span className="tabular-nums">
                        {t('participant.pages', { pages: document.page_count })}
                      </span>
                    )}
                    {/* A new or changed file: what this panel says may still change. */}
                    {analyzing && (
                      <span className={cn('rounded-full px-2 py-px text-2xs font-bold', TONE_TILE.info)}>
                        {t('participant.analyzing')}
                      </span>
                    )}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
