import {
  pointerWithin,
  rectIntersection,
  type Active,
  type CollisionDetection,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import { STAGES, type BoardCard, type Stage } from '@/api/types'

/** What each draggable card carries, so drop handlers know its stage without a lookup. */
export interface CardDragData {
  card: BoardCard
}

export function draggedCard(active: Active | null): BoardCard | null {
  return (active?.data.current as CardDragData | undefined)?.card ?? null
}

/** Droppable ids are stages; anything else is not a column. */
export function stageOf(id: unknown): Stage | null {
  return STAGES.find((stage) => stage === id) ?? null
}

/**
 * The column under the pointer. The keyboard has no pointer, and the pointer
 * can sit in the gap between columns: then the column the card overlaps most.
 */
export const columnCollision: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args)
  return underPointer.length > 0 ? underPointer : rectIntersection(args)
}

/**
 * Left and right arrows jump to the next column instead of moving 25px.
 * Up and down do nothing: cards in a column have no manual order.
 */
export const columnKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { context, currentCoordinates },
) => {
  const step = event.code === 'ArrowRight' ? 1 : event.code === 'ArrowLeft' ? -1 : 0
  if (event.code === 'ArrowUp' || event.code === 'ArrowDown') event.preventDefault()
  if (step === 0) return undefined
  event.preventDefault()

  const { collisionRect, droppableContainers, droppableRects, over } = context
  if (!collisionRect) return undefined
  const columns = droppableContainers
    .getEnabled()
    .flatMap((container) => {
      const rect = droppableRects.get(container.id)
      return rect ? [{ id: container.id, rect }] : []
    })
    .sort((a, b) => a.rect.left - b.rect.left)

  const center = collisionRect.left + collisionRect.width / 2
  const current = over
    ? columns.findIndex((column) => column.id === over.id)
    : columns.findIndex((column) => center >= column.rect.left && center <= column.rect.right)
  const target = current === -1 ? undefined : columns[current + step]
  if (!target) return undefined
  return { x: target.rect.left + (target.rect.width - collisionRect.width) / 2, y: currentCoordinates.y }
}
