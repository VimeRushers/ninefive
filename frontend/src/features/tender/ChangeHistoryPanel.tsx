import { CircleCheck, CircleSlash, History, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { RelevanceVerdict, TenderChange } from '@/api/types'
import { CitedText } from '@/components/shared/CitedText'
import { PanelBody } from '@/components/shared/Panel'
import { StageBadge } from '@/components/shared/StageBadge'
import { useRelativeTime } from '@/hooks/use-relative-time'
import { formatDateTime } from '@/lib/format'
import { TONE_TILE, type Tone } from '@/lib/tone'
import { cn } from '@/lib/utils'
import { PanelMessage } from './PanelMessage'
import { SectionPanel } from './SectionPanel'

const VERDICT: Record<RelevanceVerdict, { icon: LucideIcon; tone: Tone; dot: string }> = {
  still_relevant: { icon: CircleCheck, tone: 'good', dot: 'bg-good' },
  irrelevant: { icon: CircleSlash, tone: 'warning', dot: 'bg-warning' },
}

/** What each MTender sync changed in the tender, and whether it still fits the company. */
export function ChangeHistoryPanel({ changes, className }: { changes: TenderChange[]; className?: string }) {
  const { t } = useTranslation('tender')
  // The API sends newest first; sorting again keeps the timeline right if that ever slips.
  const sorted = [...changes].sort((a, b) => Date.parse(b.synced_at) - Date.parse(a.synced_at))

  return (
    <SectionPanel title={t('changes.title')} className={className}>
      <PanelBody>
        {sorted.length === 0 ? (
          <PanelMessage icon={History} title={t('changes.empty')} description={t('changes.emptyHint')} />
        ) : (
          <ol className="space-y-5">
            {sorted.map((change, index) => (
              <ChangeEntry
                key={`${change.synced_at}-${index}`}
                change={change}
                last={index === sorted.length - 1}
              />
            ))}
          </ol>
        )}
      </PanelBody>
    </SectionPanel>
  )
}

function ChangeEntry({ change, last }: { change: TenderChange; last: boolean }) {
  const { t, i18n } = useTranslation('tender')
  const relative = useRelativeTime(change.synced_at)
  const { icon: Icon, tone, dot } = VERDICT[change.verdict]
  const stageMoved = change.stage_before !== change.stage_after

  return (
    <li className="relative pl-6">
      {!last && <span aria-hidden className="absolute top-4 -bottom-5 left-[5px] w-px bg-line-strong" />}
      <span
        aria-hidden
        className={cn('absolute top-1 left-0 size-[11px] rounded-full ring-4 ring-card', dot)}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <time
          dateTime={change.synced_at}
          title={formatDateTime(change.synced_at, i18n.language)}
          className="text-xs font-semibold text-ink-2"
        >
          {relative}
        </time>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold whitespace-nowrap',
            TONE_TILE[tone],
          )}
        >
          <Icon aria-hidden className="size-3" />
          {t(`changes.verdict.${change.verdict}`)}
        </span>
      </div>

      <ul
        aria-label={t('changes.whatChanged')}
        className="mt-2 list-disc space-y-0.5 pl-4 text-sm marker:text-faint"
      >
        {change.changes.map((text, index) => (
          <li key={index}>{text}</li>
        ))}
      </ul>

      <CitedText item={change.reason} className="mt-2 text-sm text-ink-2" />

      <p className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span>{t('changes.stage')}</span>
        <StageBadge stage={change.stage_before} />
        {stageMoved ? (
          <>
            <span className="text-faint">→</span>
            <StageBadge stage={change.stage_after} />
          </>
        ) : (
          <span>{t('changes.stageUnchanged')}</span>
        )}
      </p>
    </li>
  )
}
