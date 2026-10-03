import { useParams } from 'react-router'
import { useTender } from '@/api/tenders'
import { QueryState } from '@/components/shared/states'
import { ChangeHistoryPanel } from './ChangeHistoryPanel'
import { DocumentsPanel } from './DocumentsPanel'
import { EligibilityPanel } from './EligibilityPanel'
import { ProductMatchPanel } from './ProductMatchPanel'
import { SummaryPanel } from './SummaryPanel'
import { WinChancePanel } from './WinChancePanel'

/**
 * The Details tab. Reading order: what the tender asks for, whether the company
 * qualifies, its chances, what changed, then the item-by-item match and the files.
 * On wide screens the checklist, usually the longest panel, runs down the right.
 */
export function TenderDetailsPage() {
  const { tenderId = '' } = useParams()
  const query = useTender(tenderId)

  return (
    <QueryState query={query}>
      {(tender) => (
        <div className="stagger grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <SummaryPanel tender={tender} />
          <EligibilityPanel tenderId={tenderId} className="xl:row-span-3" />
          <WinChancePanel tenderId={tenderId} />
          <ChangeHistoryPanel changes={tender.changes} />
          <ProductMatchPanel tender={tender} className="xl:col-span-2" />
          <DocumentsPanel tender={tender} className="xl:col-span-2" />
        </div>
      )}
    </QueryState>
  )
}
