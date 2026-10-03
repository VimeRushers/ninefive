import { CircleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMoveCardError } from '@/api/board'

/** Moves show up before the server answers; when it refuses one, the card goes back and this says so. */
export function MoveError() {
  const { t } = useTranslation('board')
  const error = useMoveCardError()
  const [dismissedAt, setDismissedAt] = useState<number | null>(null)
  if (!error || error.submittedAt === dismissedAt) return null

  return (
    <div
      role="alert"
      className="flex animate-pop-in items-start gap-2.5 rounded-xl bg-critical-soft px-3.5 py-2.5 text-sm text-critical-ink"
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p className="flex-1 font-semibold">{t('move.error')}</p>
      <button
        type="button"
        onClick={() => setDismissedAt(error.submittedAt)}
        aria-label={t('move.dismiss')}
        className="-my-0.5 grid size-6 shrink-0 place-items-center rounded-md transition-colors hover:bg-critical-ink/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  )
}
