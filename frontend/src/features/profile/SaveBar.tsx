import { Check, LoaderCircle, RotateCcw, Save, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SaveBarProps {
  dirty: boolean
  /** Some visited field has an error. */
  showsErrors: boolean
  canSave: boolean
  saving: boolean
  saved: boolean
  failed: boolean
  onDiscard: () => void
}

/** Save and discard for the whole form. Sticks to the bottom of the screen while there are unsaved changes. */
export function SaveBar({ dirty, showsErrors, canSave, saving, saved, failed, onDiscard }: SaveBarProps) {
  const { t } = useTranslation('profile')

  let status = null
  if (failed) {
    status = (
      <span className="flex items-center gap-2 font-semibold text-critical-ink">
        <TriangleAlert aria-hidden className="size-4 shrink-0" />
        {t('save.failed')}
      </span>
    )
  } else if (dirty && showsErrors) {
    status = <span className="font-semibold text-warning-ink">{t('save.invalid')}</span>
  } else if (dirty) {
    status = (
      <span className="flex items-center gap-2 text-ink-2">
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-warning" />
        {t('save.unsaved')}
      </span>
    )
  } else if (saved) {
    status = (
      <span className="flex animate-pop-in items-center gap-2 font-semibold text-good-ink">
        <Check aria-hidden className="size-4 shrink-0" />
        {t('save.saved')}
      </span>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border px-[18px] py-3 transition-[background-color,border-color,box-shadow] duration-200',
        // A card only while there is something to save; otherwise just the buttons.
        dirty ? 'sticky bottom-4 z-10 bg-card shadow-float' : 'border-transparent',
      )}
    >
      <div aria-live="polite" className="min-w-0 flex-1 text-sm">
        {status}
      </div>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onDiscard}
          disabled={!dirty || saving}
          className="h-9 rounded-lg px-3"
        >
          <RotateCcw aria-hidden />
          {t('save.discard')}
        </Button>
        <Button type="submit" disabled={!canSave} className="h-9 rounded-lg px-3">
          {saving ? <LoaderCircle aria-hidden className="animate-spin" /> : <Save aria-hidden />}
          {saving ? t('save.saving') : t('save.save')}
        </Button>
      </div>
    </div>
  )
}
