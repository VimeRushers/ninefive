import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Active,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useMoveCard } from '@/api/board'
import type { BoardCard, Stage } from '@/api/types'
import { StageBadge } from '@/components/shared/StageBadge'
import { cn } from '@/lib/utils'
import { columnCollision, columnKeyboardCoordinates, draggedCard, stageOf, type CardDragData } from './drag'
import { focusAfterMove } from './focus-after-move'
import { TenderCard } from './TenderCard'
import { useFillHeight } from './use-fill-height'

/** Columns keep this width; the board scrolls sideways instead of squeezing them. */
const COLUMN_WIDTH = 296
const COLUMN_GAP = 16
const FADE = 'black 0, black calc(100% - 40px), transparent 100%'

/** The column under a dragged card takes its stage color. */
const DROP_TONE: Record<Stage, string> = {
  new: 'bg-stage-new-soft ring-stage-new/40',
  questionable: 'bg-stage-questionable-soft ring-stage-questionable/40',
  not_interested: 'bg-stage-not-interested-soft ring-stage-not-interested/40',
  lost: 'bg-stage-lost-soft ring-stage-lost/40',
  won: 'bg-stage-won-soft ring-stage-won/40',
}

interface BoardColumnsProps {
  columns: { stage: Stage; cards: BoardCard[] }[]
}

export function BoardColumns({ columns }: BoardColumnsProps) {
  const { t } = useTranslation('board')
  const [boardRef, height] = useFillHeight<HTMLDivElement>()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })
  const drag = useCardDrag()

  const updateEdges = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    setEdges({
      left: scroller.scrollLeft > 4,
      right: scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 4,
    })
  }, [])

  useEffect(() => {
    updateEdges()
    window.addEventListener('resize', updateEdges)
    return () => window.removeEventListener('resize', updateEdges)
  }, [updateEdges])

  const scrollByColumn = (direction: -1 | 1) =>
    scrollerRef.current?.scrollBy({ left: direction * (COLUMN_WIDTH + COLUMN_GAP), behavior: 'smooth' })

  // Fade the edge where more columns are hidden.
  const mask =
    edges.left && edges.right
      ? `linear-gradient(to right, transparent 0, black 40px, black calc(100% - 40px), transparent 100%)`
      : edges.left
        ? `linear-gradient(to left, ${FADE})`
        : edges.right
          ? `linear-gradient(to right, ${FADE})`
          : undefined

  return (
    <DndContext {...drag.contextProps}>
      <div ref={boardRef} className="group/board relative" style={height ? { height } : undefined}>
        <div
          ref={scrollerRef}
          onScroll={updateEdges}
          className={cn(
            'flex h-full snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:thin] lg:snap-none',
            // Snapping fights the auto-scroll while a card is dragged to an edge.
            drag.active && 'snap-none',
          )}
          style={{ maskImage: mask, WebkitMaskImage: mask }}
        >
          {columns.map(({ stage, cards }) => (
            <BoardColumn key={stage} stage={stage} cards={cards} />
          ))}
        </div>

        {(['left', 'right'] as const).map((side) =>
          edges[side] ? (
            <button
              key={side}
              type="button"
              onClick={() => scrollByColumn(side === 'left' ? -1 : 1)}
              aria-label={side === 'left' ? t('scrollLeft') : t('scrollRight')}
              className={cn(
                'absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full border bg-card text-foreground shadow-float transition-opacity duration-200 sm:grid',
                'opacity-0 group-hover/board:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                side === 'left' ? 'left-2' : 'right-2',
              )}
            >
              {side === 'left' ? (
                <ChevronLeft aria-hidden className="size-5" />
              ) : (
                <ChevronRight aria-hidden className="size-5" />
              )}
            </button>
          ) : null,
        )}
      </div>

      {/* In a portal, so the board's mask and scroll clipping never cut the card off. */}
      {createPortal(
        <DragOverlay dropAnimation={drag.dropAnimation}>
          {drag.active && (
            <div inert>
              <TenderCard card={drag.active} overlay />
            </div>
          )}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  )
}

/** Sensors, screen reader text and the drop handler for dragging cards between columns. */
function useCardDrag() {
  const { t } = useTranslation('board')
  const { t: tc } = useTranslation()
  const move = useMoveCard()
  const [active, setActive] = useState<BoardCard | null>(null)
  // Where the card will land; kept after the drop so the overlay knows not to fly back.
  const [target, setTarget] = useState<Stage | null>(null)

  const sensors = useSensors(
    // A few pixels of movement before a drag starts, so a click still opens the tender.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinates }),
  )

  const announcements = useMemo<Announcements>(() => {
    const title = (active: Active) => draggedCard(active)?.title ?? ''
    const stageName = (stage: Stage | null | undefined) => (stage ? tc(`stage.${stage}`) : '')
    return {
      onDragStart: ({ active }) =>
        t('drag.picked', { title: title(active), stage: stageName(draggedCard(active)?.stage) }),
      onDragOver: ({ over }) =>
        over ? t('drag.over', { stage: stageName(stageOf(over.id)) }) : t('drag.outside'),
      onDragEnd: ({ active, over }) => {
        const from = draggedCard(active)?.stage
        const to = stageOf(over?.id)
        return to && to !== from
          ? t('drag.dropped', { title: title(active), stage: stageName(to) })
          : t('drag.stayed', { title: title(active), stage: stageName(from) })
      },
      onDragCancel: ({ active }) =>
        t('drag.cancelled', { title: title(active), stage: stageName(draggedCard(active)?.stage) }),
    }
  }, [t, tc])

  const onDragStart = ({ active }: DragStartEvent) => {
    setActive(draggedCard(active))
    setTarget(null)
  }

  const onDragOver = ({ active, over }: DragOverEvent) => {
    const stage = stageOf(over?.id)
    setTarget(stage && stage !== draggedCard(active)?.stage ? stage : null)
  }

  const onDragEnd = ({ active, over, activatorEvent }: DragEndEvent) => {
    setActive(null)
    const card = draggedCard(active)
    const stage = stageOf(over?.id)
    if (!card || !stage || stage === card.stage) return
    // A keyboard drop remounts the card in its new column; focus follows it there.
    if (activatorEvent instanceof KeyboardEvent) focusAfterMove(card.tender_id)
    move.mutate({ tenderId: card.tender_id, stage })
  }

  const reduceMotion =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return {
    active,
    // Fly back only when the card goes nowhere; a moved card shows up in its new column instead.
    dropAnimation: reduceMotion || target ? null : undefined,
    contextProps: {
      sensors,
      collisionDetection: columnCollision,
      accessibility: { announcements, screenReaderInstructions: { draggable: t('drag.instructions') } },
      onDragStart,
      onDragOver,
      onDragEnd,
      onDragCancel: () => {
        setActive(null)
        setTarget(null)
      },
    },
  }
}

function BoardColumn({ stage, cards }: { stage: Stage; cards: BoardCard[] }) {
  const { t } = useTranslation('board')
  const { t: tc } = useTranslation()
  const { setNodeRef, isOver, active } = useDroppable({ id: stage })
  const from = draggedCard(active)?.stage
  // Any other column is somewhere the dragged card can go.
  const canDrop = from !== undefined && from !== stage

  return (
    <section
      ref={setNodeRef}
      aria-label={tc(`stage.${stage}`)}
      style={{ width: COLUMN_WIDTH }}
      className={cn(
        'flex min-h-0 shrink-0 animate-panel-in snap-start flex-col rounded-2xl border bg-surface-2 transition-[background-color,border-color,box-shadow] duration-200',
        canDrop && 'border-dashed border-line-strong',
        canDrop && isOver && `border-transparent ring-2 ${DROP_TONE[stage]}`,
      )}
    >
      <header className="flex min-h-12 shrink-0 items-center justify-between gap-2 px-3.5 pt-2.5 pb-2">
        <StageBadge stage={stage} />
        <span className="text-xs font-semibold text-muted-foreground tabular-nums">
          {t('cardCount', { count: cards.length })}
        </span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-2.5 [scrollbar-width:thin]">
        {cards.length === 0 ? (
          <p className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-faint">
            {t('column.empty')}
          </p>
        ) : (
          <ul className="space-y-2.5">
            {cards.map((card) => (
              <li key={card.tender_id}>
                <DraggableCard card={card} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function DraggableCard({ card }: { card: BoardCard }) {
  const { t } = useTranslation('board')
  const data: CardDragData = { card }
  const drag = useDraggable({
    id: card.tender_id,
    data,
    attributes: { roleDescription: t('drag.roleDescription') },
  })
  return <TenderCard card={card} drag={drag} />
}
