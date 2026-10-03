import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface TagChipsProps {
  tags: string[]
  /** Makes the chips toggle buttons, e.g. for filtering. */
  onToggle?: (tag: string) => void
  selected?: string[]
  /** Accessible name of the list; defaults to "Tags". */
  label?: string
  className?: string
}

const chip = 'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap'

/** Visible AI tags. Pass onToggle to use them as filters. */
export function TagChips({ tags, onToggle, selected = [], label, className }: TagChipsProps) {
  const { t } = useTranslation()
  if (tags.length === 0) return null

  return (
    <ul aria-label={label ?? t('tags.label')} className={cn('flex flex-wrap gap-1', className)}>
      {tags.map((tag) => {
        const isSelected = selected.includes(tag)
        return (
          <li key={tag}>
            {onToggle ? (
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggle(tag)}
                className={cn(
                  chip,
                  'border transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  isSelected
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : 'bg-card text-ink-2 hover:bg-surface-3',
                )}
              >
                {tag}
              </button>
            ) : (
              <span className={cn(chip, 'bg-surface-3 text-ink-2')}>{tag}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
