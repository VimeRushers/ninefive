import { useTranslation } from 'react-i18next'
import type { Stage } from '@/api/types'
import { STAGE_TONE } from '@/lib/stage'
import { TONE_TILE } from '@/lib/tone'
import { cn } from '@/lib/utils'

export function StageBadge({ stage, className }: { stage: Stage; className?: string }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-bold whitespace-nowrap',
        TONE_TILE[STAGE_TONE[stage]],
        className,
      )}
    >
      {t(`stage.${stage}`)}
    </span>
  )
}
