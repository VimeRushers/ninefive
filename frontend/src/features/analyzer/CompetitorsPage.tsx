import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { useCompetitors, useTender } from '@/api/tenders'
import type { CompetitorAnalysis, TenderDetail } from '@/api/types'
import { EmptyState, QueryState } from '@/components/shared/states'
import { AnalysisBanner, NoDocumentsState } from './AnalysisStatus'
import { CompetitorKpis } from './CompetitorKpis'
import { LessonsPanel } from './LessonsPanel'
import { orderParticipants, participantDocuments } from './participants'
import { ParticipantPanel } from './ParticipantPanel'

/**
 * The "Concurenți" tab: what the other bids' documents say and what to take from them.
 * The tender is already loaded by the layout; it brings the documents and the estimated value.
 */
export function CompetitorsPage() {
  const { tenderId = '' } = useParams()
  const tender = useTender(tenderId)
  const competitors = useCompetitors(tenderId)

  return (
    <QueryState query={tender}>
      {(detail) => (
        <QueryState query={competitors}>
          {(analysis) => <CompetitorsView tender={detail} analysis={analysis} />}
        </QueryState>
      )}
    </QueryState>
  )
}

function CompetitorsView({ tender, analysis }: { tender: TenderDetail; analysis: CompetitorAnalysis }) {
  const { t } = useTranslation('analyzer')
  const headingId = useId()

  // MTender does not publish bids before bid opening, so most open tenders end here.
  if (analysis.state === 'no_documents') return <NoDocumentsState deadline={tender.deadline} />

  const participants = orderParticipants(analysis.participants)
  // While the first analysis runs there is nothing to show yet; the banner says so.
  const nothingFound = participants.length === 0 && analysis.state === 'up_to_date'

  return (
    <div className="space-y-5">
      <AnalysisBanner analysis={analysis} />
      {participants.length > 0 && (
        <>
          <CompetitorKpis participants={participants} estimate={tender.estimated_value} />
          <section aria-labelledby={headingId}>
            <h2 id={headingId} className="sr-only">
              {t('participants.title')}
            </h2>
            <div className="stagger grid gap-4">
              {participants.map((participant) => (
                <ParticipantPanel
                  key={participant.participant_id}
                  participant={participant}
                  estimate={tender.estimated_value}
                  documents={participantDocuments(participant, tender.documents)}
                />
              ))}
            </div>
          </section>
        </>
      )}
      {nothingFound && <EmptyState title={t('noParticipants')} />}
      <LessonsPanel lessons={analysis.lessons} />
    </div>
  )
}
