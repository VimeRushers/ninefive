import { useTranslation } from 'react-i18next'
import type { ParticipantStatus } from '@/api/types'
import { TONE_TILE } from '@/lib/tone'
import { cn } from '@/lib/utils'
import { STATUS_ICON, STATUS_TONE } from './participants'

/** Outcome of a bid. An icon goes with the color, so the status never depends on color alone. */
export function StatusBadge({ status, className }: { status: ParticipantStatus; className?: string }) {
  const { t } = useTranslation('analyzer')
  const Icon = STATUS_ICON[status]
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold whitespace-nowrap',
        TONE_TILE[STATUS_TONE[status]],
        className,
      )}
    >
      <Icon aria-hidden className="size-3" />
      {t(`participantStatus.${status}`)}
    </span>
  )
}
