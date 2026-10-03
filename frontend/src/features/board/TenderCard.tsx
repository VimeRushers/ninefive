import type { useDraggable } from '@dnd-kit/core'
import { Bot, GripVertical, ShieldAlert } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useMoveCard } from '@/api/board'
import type { BoardCard, Stage } from '@/api/types'
import { TagChips } from '@/components/shared/TagChips'
import { eligibilityPercent } from '@/lib/eligibility'
import { formatMoney, formatPercent, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CardMenu } from './CardMenu'
import { focusAfterMove, takeFocusRequest } from './focus-after-move'
import { QuestionableReasons } from './QuestionableReasons'

interface TenderCardProps {
  card: BoardCard
  /** From useDraggable. Without it the card has no drag handle. */
  drag?: ReturnType<typeof useDraggable>
  /** The copy that follows the pointer while dragging. */
  overlay?: boolean
}

/**
 * One tender on the board. The title is the link, stretched over the whole card,
 * so the menu, buttons and citations on top of it can be real buttons and links.
 */
export function TenderCard({ card, drag, overlay = false }: TenderCardProps) {
  const { t, i18n } = useTranslation('board')
  const { t: tc } = useTranslation()
  const move = useMoveCard()
  const linkRef = useRef<HTMLAnchorElement>(null)
  const titleId = useId()
  const language = i18n.language
  const eligibility = eligibilityPercent(card.eligibility)

  // A move from this card remounts it in another column; take focus back once it lands.
  useEffect(() => {
    if (!overlay && takeFocusRequest(card.tender_id)) linkRef.current?.focus()
  }, [overlay, card.tender_id, card.stage])

  const moveTo = (stage: Stage) => {
    focusAfterMove(card.tender_id)
    move.mutate({ tenderId: card.tender_id, stage })
  }

  return (
    <article
      ref={drag?.setNodeRef}
      {...drag?.listeners}
      aria-labelledby={titleId}
      className={cn(
        'group/card relative rounded-xl border bg-card p-3.5 shadow-soft transition-[border-color,box-shadow,transform,opacity] duration-200',
        'hover:-translate-y-px hover:border-line-strong hover:shadow-panel focus-within:border-line-strong focus-within:shadow-panel',
        'has-[[data-card-link]:focus-visible]:ring-2 has-[[data-card-link]:focus-visible]:ring-ring',
        drag?.isDragging && 'opacity-40',
        overlay && 'rotate-1 cursor-grabbing border-line-strong shadow-float',
      )}
    >
      <div className="flex items-start gap-2">
        <p className="line-clamp-1 min-w-0 flex-1 pt-0.5 text-xs font-medium text-muted-foreground">
          {card.buyer_name}
        </p>
        {card.changed_in_last_sync && (
          <span className="shrink-0 rounded-full bg-info-soft px-2 py-px text-2xs font-bold text-info-ink">
            {t('card.updated')}
          </span>
        )}
        <div className="relative z-10 -mt-1 -mr-1.5 flex shrink-0 items-center">
          {(drag || overlay) && <DragHandle card={card} drag={drag} />}
          {/* The menu opens in a portal whose events still bubble here; they must not start a drag. */}
          <div onPointerDown={(event) => event.stopPropagation()}>
            <CardMenu card={card} onMove={moveTo} />
          </div>
        </div>
      </div>

      <h3 id={titleId} className="mt-1 line-clamp-3 text-sm leading-snug font-bold text-foreground">
        <Link
          ref={linkRef}
          to={`/tenders/${encodeURIComponent(card.tender_id)}`}
          data-card-link
          draggable={false}
          className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
        >
          {card.title}
        </Link>
      </h3>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <dt className="text-faint">{t('card.value')}</dt>
          <dd className="font-bold tabular-nums">
            {card.estimated_value ? formatMoney(card.estimated_value, language) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-faint">{t('card.deadline')}</dt>
          <dd className="font-bold">{card.deadline ? formatRelative(card.deadline, language) : '—'}</dd>
        </div>
        <div>
          <dt className="text-faint">{t('card.eligibility')}</dt>
          <dd className="font-bold tabular-nums">
            {eligibility === null ? '—' : formatPercent(eligibility, language)}
          </dd>
        </div>
        <div>
          <dt className="text-faint">{t('card.winChance')}</dt>
          <dd className="font-bold tabular-nums">
            {card.win_probability === null ? '—' : formatPercent(card.win_probability, language)}
          </dd>
        </div>
      </dl>

      {card.stage === 'questionable' && card.questionable_reasons.length > 0 && (
        <QuestionableReasons reasons={card.questionable_reasons} onMove={moveTo} />
      )}

      {card.stage_reason && (
        <div className="mt-3 rounded-lg border bg-surface-2 px-2.5 py-2 text-xs leading-snug">
          {card.stage_source === 'auto' && (
            <p className="mb-0.5 flex items-center gap-1 font-bold text-ink-2">
              <Bot aria-hidden className="size-3.5 shrink-0" />
              {tc('stageSource.auto')}
            </p>
          )}
          <p className="text-muted-foreground">{card.stage_reason}</p>
        </div>
      )}

      {(card.tags.length > 0 || card.red_flag_count > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-1">
          {card.red_flag_count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-signal-soft px-2 py-0.5 text-xs font-bold text-signal">
              <ShieldAlert aria-hidden className="size-3" />
              {t('card.signals', { count: card.red_flag_count })}
            </span>
          )}
          <TagChips tags={card.tags} />
        </div>
      )}
    </article>
  )
}

/**
 * Grip for dragging with the keyboard (Space, arrows, Space) and on touch screens,
 * where dragging the card itself would fight with scrolling. A mouse can drag the whole card.
 */
function DragHandle({ card, drag }: { card: BoardCard; drag?: ReturnType<typeof useDraggable> }) {
  const { t } = useTranslation('board')
  const className =
    'grid size-7 place-items-center rounded-md text-faint transition-[opacity,color,background-color] duration-150'
  if (!drag) {
    return (
      <span aria-hidden className={cn(className, 'text-foreground')}>
        <GripVertical className="size-4" />
      </span>
    )
  }
  const { setActivatorNodeRef, attributes } = drag
  return (
    <button
      ref={setActivatorNodeRef}
      type="button"
      {...attributes}
      aria-label={t('drag.handle', { title: card.title })}
      className={cn(
        className,
        'cursor-grab touch-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing',
        // Shown on hover and focus where there is a mouse; always on touch screens.
        'opacity-0 group-focus-within/card:opacity-100 group-hover/card:opacity-100 pointer-coarse:opacity-100',
      )}
    >
      <GripVertical aria-hidden className="size-4" />
    </button>
  )
}
