import { CircleCheck, CircleDashed, CircleX, ListChecks, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTenderAnalysis } from '@/api/tenders'
import type { EligibilityChecklist, EligibilityItem } from '@/api/types'
import { CitationLink } from '@/components/shared/CitationLink'
import { DisclaimerBanner } from '@/components/shared/DisclaimerBanner'
import { PanelBody } from '@/components/shared/Panel'
import { QueryState } from '@/components/shared/states'
import { eligibilityPercent } from '@/lib/eligibility'
import { formatPercent } from '@/lib/format'
import { TONE_TILE, type Tone } from '@/lib/tone'
import { cn } from '@/lib/utils'
import { Meter } from './Meter'
import { PanelMessage } from './PanelMessage'
import { SectionPanel } from './SectionPanel'

type Status = 'met' | 'notMet' | 'notChecked'

/** Distinct shapes as well as colors, so the status reads without color too. */
const STATUS: Record<Status, { icon: LucideIcon; tone: Tone }> = {
  met: { icon: CircleCheck, tone: 'good' },
  notMet: { icon: CircleX, tone: 'critical' },
  notChecked: { icon: CircleDashed, tone: 'neutral' },
}

/** Problems first: what blocks the bid, then what a person still has to check. */
const STATUS_ORDER: Record<Status, number> = { notMet: 0, notChecked: 1, met: 2 }

const statusOf = (item: EligibilityItem): Status =>
  item.met === null ? 'notChecked' : item.met ? 'met' : 'notMet'

/** The AI's reading of the tender's requirements against the company profile. An assistant, not legal advice. */
export function EligibilityPanel({ tenderId, className }: { tenderId: string; className?: string }) {
  const { t } = useTranslation('tender')
  const query = useTenderAnalysis(tenderId)

  return (
    <SectionPanel title={t('eligibility.title')} className={className}>
      <PanelBody>
        <QueryState query={query}>
          {({ eligibility }) =>
            eligibility && eligibility.items.length > 0 ? (
              <Checklist checklist={eligibility} />
            ) : (
              <PanelMessage
                icon={ListChecks}
                title={t('eligibility.empty.title')}
                description={t('eligibility.empty.description')}
              />
            )
          }
        </QueryState>
      </PanelBody>
    </SectionPanel>
  )
}

function Checklist({ checklist }: { checklist: EligibilityChecklist }) {
  const { t } = useTranslation('tender')
  const items = checklist.items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => STATUS_ORDER[statusOf(a.item)] - STATUS_ORDER[statusOf(b.item)])

  return (
    <div className="space-y-4">
      <ChecklistSummary checklist={checklist} />
      <ul aria-label={t('eligibility.listLabel')} className="divide-y">
        {items.map(({ item, index }) => (
          <RequirementRow key={index} item={item} />
        ))}
      </ul>
      <DisclaimerBanner kind="legal" />
    </div>
  )
}

/** "4 of 6 met, 1 not checked" and the percent the board uses: met / (total − not checked). */
function ChecklistSummary({ checklist }: { checklist: EligibilityChecklist }) {
  const { t, i18n } = useTranslation('tender')
  const unknown = checklist.items.filter((item) => item.met === null).length
  const counts = { met: checklist.met_count, total: checklist.total_count }
  const percent = eligibilityPercent({
    met_count: checklist.met_count,
    total_count: checklist.total_count,
    unknown_count: unknown,
  })

  return (
    <div className="flex items-center gap-4 border-b pb-4">
      <p className="text-kpi font-extrabold tracking-tight tabular-nums">
        {percent === null ? '—' : formatPercent(percent, i18n.language)}
      </p>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-semibold">
          {unknown > 0
            ? t('eligibility.metNotChecked', { ...counts, count: unknown })
            : t('eligibility.met', counts)}
        </p>
        <Meter value={percent ?? 0} />
        {unknown > 0 && <p className="text-xs text-muted-foreground">{t('eligibility.percentHint')}</p>}
      </div>
    </div>
  )
}

function RequirementRow({ item }: { item: EligibilityItem }) {
  const { t } = useTranslation('tender')
  const status = statusOf(item)
  const { icon: Icon, tone } = STATUS[status]
  const statusLabel = t(`eligibility.status.${status}`)

  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <span
        title={statusLabel}
        className={cn('mt-px grid size-7 shrink-0 place-items-center rounded-lg', TONE_TILE[tone])}
      >
        <Icon aria-hidden className="size-4" />
        <span className="sr-only">{statusLabel}</span>
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <p className="min-w-0 text-sm leading-snug font-semibold">{item.requirement}</p>
          <span className="rounded-md bg-surface-3 px-2 py-0.5 text-2xs font-semibold whitespace-nowrap text-ink-2">
            {t(`eligibility.type.${item.requirement_type}`)}
          </span>
        </div>
        {item.threshold && (
          <p className="text-xs text-ink-2">{t('eligibility.required', { value: item.threshold })}</p>
        )}
        {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
        {item.citation ? (
          <CitationLink citation={item.citation} />
        ) : (
          <p className="text-xs text-faint">{t('eligibility.notFound')}</p>
        )}
      </div>
    </li>
  )
}
