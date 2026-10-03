import { Building2, FileText, Landmark, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCompetitors } from '@/api/tenders'
import type { DocumentAnalysisStatus, TenderDetail, TenderDocument } from '@/api/types'
import { PanelBody } from '@/components/shared/Panel'
import { Table, Td, Th, Tr } from '@/components/shared/Table'
import { TONE_TILE, type Tone } from '@/lib/tone'
import { cn } from '@/lib/utils'
import { PanelMessage } from './PanelMessage'
import { SectionPanel } from './SectionPanel'

const STATUS_TONE: Record<DocumentAnalysisStatus, Tone> = {
  pending: 'neutral',
  analyzing: 'info',
  analyzed: 'good',
  failed: 'critical',
}

/** The buyer's documents first, then each participant's bid files. */
export function DocumentsPanel({ tender, className }: { tender: TenderDetail; className?: string }) {
  const { t } = useTranslation('tender')
  const buyerDocuments = tender.documents.filter((document) => document.participant_id === null)
  const participantDocuments = tender.documents.filter((document) => document.participant_id !== null)

  return (
    <SectionPanel
      title={t('documents.title')}
      className={className}
      actions={<span className="text-xs font-semibold text-muted-foreground">{tender.documents.length}</span>}
    >
      {tender.documents.length === 0 ? (
        <PanelBody>
          <PanelMessage icon={FileText} title={t('documents.empty')} />
        </PanelBody>
      ) : (
        <div className="pt-2 pb-3">
          <Table>
            <thead>
              <tr>
                <Th>{t('documents.name')}</Th>
                <Th numeric>{t('documents.pages')}</Th>
                <Th>{t('documents.analysis')}</Th>
              </tr>
            </thead>
            {buyerDocuments.length > 0 && (
              <DocumentGroup icon={Landmark} label={t('documents.byBuyer')} documents={buyerDocuments} />
            )}
            {participantDocuments.length > 0 && (
              <ParticipantGroups tenderId={tender.tender_id} documents={participantDocuments} />
            )}
          </Table>
        </div>
      )}
    </SectionPanel>
  )
}

/**
 * One group per participant, in the order their files appear. Names come from the
 * competitor analysis, so only tenders with bid files ask for it; until it loads, or
 * if it does not know a participant, a numbered label stands in.
 */
function ParticipantGroups({ tenderId, documents }: { tenderId: string; documents: TenderDocument[] }) {
  const { t } = useTranslation('tender')
  const { data } = useCompetitors(tenderId)
  const participants = new Map(
    data?.participants.map((participant) => [participant.participant_id, participant]),
  )

  const groups = new Map<string, TenderDocument[]>()
  for (const document of documents) {
    const id = document.participant_id ?? ''
    groups.set(id, [...(groups.get(id) ?? []), document])
  }

  return [...groups].map(([id, files], index) => {
    const participant = participants.get(id)
    return (
      <DocumentGroup
        key={id}
        icon={Building2}
        label={participant?.name ?? t('documents.participant', { number: index + 1 })}
        ownBid={participant?.is_us}
        documents={files}
      />
    )
  })
}

interface DocumentGroupProps {
  icon: LucideIcon
  label: string
  /** Marks the company's own bid. */
  ownBid?: boolean
  documents: TenderDocument[]
}

function DocumentGroup({ icon: Icon, label, ownBid, documents }: DocumentGroupProps) {
  const { t } = useTranslation('tender')
  return (
    <tbody>
      <tr className="border-t">
        <th
          scope="rowgroup"
          colSpan={3}
          className="px-[18px] pt-3.5 pb-1.5 text-left text-xs font-bold text-ink-2"
        >
          <span className="inline-flex flex-wrap items-center gap-2">
            <Icon aria-hidden className="size-3.5 text-muted-foreground" />
            {label}
            {ownBid && (
              <span className="rounded-md bg-accent px-1.5 py-px text-2xs font-bold text-accent-foreground">
                {t('documents.ownBid')}
              </span>
            )}
          </span>
        </th>
      </tr>
      {documents.map((document) => (
        <DocumentRow key={document.document_id} document={document} />
      ))}
    </tbody>
  )
}

function DocumentRow({ document }: { document: TenderDocument }) {
  const { t } = useTranslation('tender')
  return (
    <Tr>
      <Td>
        <a
          href={document.url}
          target="_blank"
          rel="noreferrer"
          lang={document.language ?? undefined}
          className="inline-flex items-center gap-2 rounded-sm font-semibold hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          {document.title}
        </a>
      </Td>
      <Td numeric>{document.page_count ?? '—'}</Td>
      <Td>
        <span
          className={cn(
            'inline-flex rounded-md px-2 py-0.5 text-xs font-bold whitespace-nowrap',
            TONE_TILE[STATUS_TONE[document.analysis_status]],
          )}
        >
          {t(`analysisStatus.${document.analysis_status}`)}
        </span>
      </Td>
    </Tr>
  )
}
