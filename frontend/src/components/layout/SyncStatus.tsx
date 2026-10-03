import { RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useBoard } from '@/api/board'
import { useRelativeTime } from '@/hooks/use-relative-time'
import { formatDateTime } from '@/lib/format'

/** When the backend last pulled MTender. Sits in the sidebar footer. */
export function SyncStatus() {
  const { t, i18n } = useTranslation()
  const { data } = useBoard()
  const lastSync = data?.last_sync_at ?? null
  const relative = useRelativeTime(lastSync)
  if (!data) return null

  return (
    <p className="flex items-start gap-1.5 text-2xs leading-snug text-side-muted">
      <RefreshCw aria-hidden className="mt-px size-3 shrink-0" />
      {lastSync ? (
        <time dateTime={lastSync} title={formatDateTime(lastSync, i18n.language)}>
          {t('sync.last', { time: relative })}
        </time>
      ) : (
        t('sync.never')
      )}
    </p>
  )
}
