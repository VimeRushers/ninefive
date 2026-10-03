import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { useTender, useTenderAnalysis } from '@/api/tenders'
import type { RedFlag } from '@/api/types'
import { EmptyState, QueryState } from '@/components/shared/states'
import { NotDetectedList } from './NotDetectedList'
import { SignalCard } from './SignalCard'
import { SignalSummary } from './SignalSummary'
import { orderFlags, signalStatus } from './signals'

/**
 * The tender's integrity tab: patterns in its data, each with cited evidence.
 * Never call a buyer or company corrupt; show the evidence and let the user judge.
 */
export function IntegrityPage() {
  const { tenderId = '' } = useParams()
  const query = useTenderAnalysis(tenderId)
  // The tender layout has already loaded it; here it only supplies the buyer for the history links.
  const buyerId = useTender(tenderId).data?.buyer_id

  return (
    <QueryState query={query}>
      {(analysis) => <IntegritySignals flags={analysis.red_flags} buyerId={buyerId} />}
    </QueryState>
  )
}

/** Summary first, then the detected signals, then what was checked and found nothing. */
function IntegritySignals({ flags, buyerId }: { flags: RedFlag[]; buyerId?: string }) {
  const { t } = useTranslation('integrity')
  const checked = orderFlags(flags)

  if (checked.length === 0) {
    return <EmptyState title={t('empty.title')} description={t('empty.description')} />
  }

  const detected = checked.filter((flag) => signalStatus(flag) === 'detected')
  const others = checked.filter((flag) => signalStatus(flag) !== 'detected')

  return (
    <div className="stagger grid gap-4 xl:grid-cols-2">
      <SignalSummary found={detected.length} checked={checked.length} className="xl:col-span-2" />
      {detected.map((flag) => (
        <SignalCard key={flag.indicator} flag={flag} buyerId={buyerId} />
      ))}
      {/* After an odd number of cards, the list fills the free cell next to the last one. */}
      {others.length > 0 && <NotDetectedList flags={others} wide={detected.length % 2 === 0} />}
    </div>
  )
}
