import { CircleCheck, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Panel, PanelBody, PanelHeader } from '@/components/shared/Panel'
import { formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { COMPLETION_ITEMS, type CompletionItem } from './draft'

interface CompletionPanelProps {
  done: Record<CompletionItem, boolean>
  /** Takes the user to where the missing item is filled in. */
  onAction: (item: CompletionItem) => void
}

/** How much of what the AI needs is filled in, with each missing item as a one-click action. */
export function CompletionPanel({ done, onAction }: CompletionPanelProps) {
  const { t, i18n } = useTranslation('profile')
  const missing = COMPLETION_ITEMS.filter((item) => !done[item])
  const total = COMPLETION_ITEMS.length
  const share = (total - missing.length) / total
  const percent = formatPercent(share, i18n.language)
  const complete = missing.length === 0

  return (
    <Panel>
      <PanelHeader title={t('completion.title')} />
      <PanelBody className="grid gap-x-8 gap-y-4 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-center">
        <div className="grid gap-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-kpi font-extrabold tracking-tight tabular-nums">{percent}</span>
            <span className="text-xs text-muted-foreground">
              {t('completion.count', { done: total - missing.length, total })}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={t('completion.title')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(share * 100)}
            aria-valuetext={percent}
            className="h-2.5 overflow-hidden rounded-full bg-surface-3"
          >
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-500 ease-out',
                complete ? 'bg-good' : 'bg-primary',
              )}
              style={{ width: `${share * 100}%` }}
            />
          </div>
        </div>

        {complete ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-good-ink">
            <CircleCheck aria-hidden className="size-4 shrink-0" />
            {t('completion.complete')}
          </p>
        ) : (
          <div className="grid gap-2">
            <p className="text-sm text-ink-2">{t('completion.missing')}</p>
            <ul className="flex flex-wrap gap-2">
              {missing.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => onAction(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-semibold text-ink-2 shadow-soft transition-colors duration-150 hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <Plus aria-hidden className="size-3.5 text-primary" />
                    {t(`completion.todo.${item}`)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PanelBody>
    </Panel>
  )
}
