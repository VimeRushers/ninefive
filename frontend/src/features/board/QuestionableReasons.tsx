import { Check, ChevronDown, CircleAlert, CircleHelp, X } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  CatalogueMatchCandidate,
  GrayZone,
  QuestionableReason,
  Stage,
  UnmetParameter,
} from '@/api/types'
import { CitationLink } from '@/components/shared/CitationLink'
import { CitedText } from '@/components/shared/CitedText'
import { Button } from '@/components/ui/button'
import { formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Controls sit above the card's stretched title link, so they get their own clicks. */
const ABOVE_LINK = 'relative z-10'

interface QuestionableReasonsProps {
  reasons: QuestionableReason[]
  onMove: (stage: Stage) => void
}

/** Why a card is questionable. Only the first reason shows, so the card stays short. */
export function QuestionableReasons({ reasons, onMove }: QuestionableReasonsProps) {
  const { t } = useTranslation('board')
  const [expanded, setExpanded] = useState(false)
  const listId = useId()
  // A gray zone without a source would be an uncited AI claim.
  const shown = reasons.filter(
    (reason) => reason.kind === 'unmet_parameter' || reason.tender_item.citations.length > 0,
  )
  if (shown.length === 0) return null
  const more = shown.length - 1

  return (
    <div className="mt-3 space-y-1.5">
      <ul id={listId} className="space-y-1.5">
        {(expanded ? shown : shown.slice(0, 1)).map((reason, index) => (
          <li key={index} className="rounded-lg bg-warning-soft/60 px-2.5 py-2 text-xs leading-snug">
            {reason.kind === 'unmet_parameter' ? (
              <UnmetParameterReason reason={reason} />
            ) : (
              <GrayZoneReason reason={reason} onMove={onMove} />
            )}
          </li>
        ))}
      </ul>
      {more > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((value) => !value)}
          className={cn(
            ABOVE_LINK,
            'inline-flex items-center gap-1 rounded-sm text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          )}
        >
          {expanded ? t('reasons.less') : t('reasons.more', { count: more })}
          <ChevronDown
            aria-hidden
            className={cn('size-3.5 transition-transform duration-200', expanded && 'rotate-180')}
          />
        </button>
      )}
    </div>
  )
}

function UnmetParameterReason({ reason }: { reason: UnmetParameter }) {
  const { t } = useTranslation('board')
  return (
    <>
      <p className="flex items-start gap-1.5 font-bold text-warning-ink">
        <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
        <span>
          <span className="sr-only">{t('reasons.unmet')}: </span>
          {reason.parameter}
        </span>
      </p>
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-0.5">
        <dt className="text-muted-foreground">{t('reasons.required')}</dt>
        <dd className="font-semibold">{reason.required}</dd>
        <dt className="text-muted-foreground">{t('reasons.ours')}</dt>
        <dd className={reason.ours === null ? 'text-muted-foreground italic' : 'font-semibold'}>
          {reason.ours ?? t('reasons.notInProfile')}
        </dd>
      </dl>
      <CitationLink citation={reason.citation} className={cn(ABOVE_LINK, 'mt-1.5')} />
    </>
  )
}

/** The AI could not tell if the company has the item; the user answers and the card moves. */
function GrayZoneReason({ reason, onMove }: { reason: GrayZone; onMove: (stage: Stage) => void }) {
  const { t, i18n } = useTranslation('board')
  const questionId = useId()
  const closest = reason.closest_items.reduce<CatalogueMatchCandidate | null>(
    (best, item) => (best === null || item.similarity > best.similarity ? item : best),
    null,
  )

  return (
    <>
      <p id={questionId} className="flex items-start gap-1.5 font-bold text-warning-ink">
        <CircleHelp aria-hidden className="mt-px size-3.5 shrink-0" />
        {t('reasons.grayZone')}
      </p>
      <p className="mt-1 text-ink-2">{reason.explanation}</p>

      <p className="mt-2 text-muted-foreground">{t('reasons.required')}</p>
      <CitedText
        item={reason.tender_item}
        className="font-semibold [&_a]:relative [&_a]:z-10 [&_a]:font-normal"
      />

      <p className="mt-2 text-muted-foreground">{closest ? t('reasons.closest') : t('reasons.noClosest')}</p>
      {closest && (
        <>
          <p className="font-semibold">{closest.name}</p>
          <p className="text-muted-foreground tabular-nums">
            {t('reasons.match', { value: formatPercent(closest.similarity, i18n.language) })}
          </p>
        </>
      )}

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Button
          size="xs"
          variant="outline"
          aria-describedby={questionId}
          onClick={() => onMove('new')}
          className={cn(ABOVE_LINK, 'bg-card')}
        >
          <Check aria-hidden />
          {t('reasons.haveIt')}
        </Button>
        <Button
          size="xs"
          variant="outline"
          aria-describedby={questionId}
          onClick={() => onMove('not_interested')}
          className={cn(ABOVE_LINK, 'bg-card')}
        >
          <X aria-hidden />
          {t('reasons.dontHave')}
        </Button>
      </div>
    </>
  )
}
