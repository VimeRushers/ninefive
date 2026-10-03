import { CircleCheck, FileClock, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CompetitorAnalysis, IsoDateTime } from '@/api/types'
import { Panel } from '@/components/shared/Panel'
import { formatDate, formatDateTime } from '@/lib/format'
import { TONE_CARD, TONE_TILE } from '@/lib/tone'
import { cn } from '@/lib/utils'

/**
 * How fresh the results are. Competitors are re-analyzed only when their files
 * change, so the date of the last analysis is what the user needs to trust them.
 */
export function AnalysisBanner({ analysis }: { analysis: CompetitorAnalysis }) {
  const { t, i18n } = useTranslation('analyzer')
  if (analysis.state === 'no_documents') return null

  const date = analysis.analyzed_at ? formatDate(analysis.analyzed_at, i18n.language) : null
  const analyzing = analysis.state === 'analyzing'
  const tone = analyzing ? 'info' : 'good'
  const Icon = analyzing ? LoaderCircle : CircleCheck

  let title: string
  let description: string
  if (analyzing) {
    title = t('status.analyzing.title')
    description =
      date && analysis.participants.length > 0
        ? t('status.analyzing.previous', { date })
        : t('status.analyzing.first')
  } else {
    title = date ? t('status.upToDate.title', { date }) : t('status.upToDate.titleNoDate')
    description = date ? t('status.upToDate.since') : t('status.upToDate.sinceLast')
  }

  return (
    // A live region, so the change from "analyzing" to "up to date" is announced on refetch.
    <div
      role="status"
      className={cn(
        'flex animate-panel-in items-start gap-3 rounded-xl border bg-card px-4 py-3 shadow-soft',
        analyzing && TONE_CARD.info,
      )}
    >
      <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', TONE_TILE[tone])}>
        <Icon aria-hidden className={cn('size-4', analyzing && 'animate-spin')} />
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-bold text-foreground">{title}</p>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

/** Before bid opening there is simply nothing published yet, so this stays calm and says when to look again. */
export function NoDocumentsState({ deadline }: { deadline: IsoDateTime | null }) {
  const { t, i18n } = useTranslation('analyzer')
  // Read the clock once, so re-renders don't flip the wording around the deadline.
  const [now] = useState(() => Date.now())
  const upcoming = deadline !== null && Date.parse(deadline) > now

  return (
    <Panel className="items-start gap-2 p-7">
      <span
        aria-hidden
        className={cn('mb-1 grid size-10 place-items-center rounded-xl [&_svg]:size-5', TONE_TILE.info)}
      >
        <FileClock />
      </span>
      <h2 className="text-base font-bold">{t('noDocuments.title')}</h2>
      <p className="max-w-prose text-sm text-muted-foreground">{t('noDocuments.description')}</p>
      <p className="max-w-prose text-sm text-muted-foreground">
        {upcoming
          ? t('noDocuments.whenDeadline', { date: formatDateTime(deadline, i18n.language) })
          : t('noDocuments.when')}
      </p>
    </Panel>
  )
}
