import { useTranslation } from 'react-i18next'
import type { IsoDateTime } from '@/api/types'
import { useRelativeTime } from '@/hooks/use-relative-time'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

/** "Updated 5 minutes ago", with the exact time on hover. */
export function UpdatedAgo({ at, className }: { at: IsoDateTime; className?: string }) {
  const { t, i18n } = useTranslation()
  const relative = useRelativeTime(at)
  return (
    <time
      dateTime={at}
      title={formatDateTime(at, i18n.language)}
      className={cn('text-sm text-muted-foreground', className)}
    >
      {t('updated', { time: relative })}
    </time>
  )
}
