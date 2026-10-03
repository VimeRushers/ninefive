import { Lightbulb } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { CitedText as CitedTextData } from '@/api/types'
import { CitedText } from '@/components/shared/CitedText'
import { Panel, PanelBody, PanelHeader } from '@/components/shared/Panel'
import { TONE_TILE } from '@/lib/tone'
import { cn } from '@/lib/utils'
import { withCitations } from './participants'

/** The takeaway from the other bids, for the next tender of this kind. Hidden when nothing is cited. */
export function LessonsPanel({ lessons }: { lessons: CitedTextData[] }) {
  const { t } = useTranslation('analyzer')
  const titleId = useId()
  const shown = withCitations(lessons)
  if (shown.length === 0) return null

  return (
    <Panel aria-labelledby={titleId}>
      <PanelHeader
        title={
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className={cn('grid size-7 place-items-center rounded-lg', TONE_TILE.accent)}>
              <Lightbulb className="size-4" />
            </span>
            <span id={titleId}>{t('lessons.title')}</span>
          </span>
        }
      />
      <PanelBody>
        <ol className="space-y-4 text-sm leading-relaxed">
          {shown.map((lesson, index) => (
            <li key={index} className="flex gap-3">
              <span
                aria-hidden
                className="grid size-6 shrink-0 place-items-center rounded-md bg-surface-3 text-xs font-bold text-ink-2 tabular-nums"
              >
                {index + 1}
              </span>
              <CitedText item={lesson} className="min-w-0 pt-0.5" />
            </li>
          ))}
        </ol>
      </PanelBody>
    </Panel>
  )
}
