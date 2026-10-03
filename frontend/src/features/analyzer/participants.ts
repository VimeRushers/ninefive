import { Ban, CircleX, Hourglass, Trophy, type LucideIcon } from 'lucide-react'
import type { CitedText, MoneyAmount, Participant, ParticipantStatus, TenderDocument } from '@/api/types'
import type { Tone } from '@/lib/tone'

/** Calm tones: a turned-down bid is an outcome to learn from, not an alarm. */
export const STATUS_TONE: Record<ParticipantStatus, Tone> = {
  winner: 'good',
  under_evaluation: 'info',
  rejected: 'warning',
  disqualified: 'warning',
}

export const STATUS_ICON: Record<ParticipantStatus, LucideIcon> = {
  winner: Trophy,
  under_evaluation: Hourglass,
  rejected: CircleX,
  disqualified: Ban,
}

const rank = (participant: Participant) => (participant.status === 'winner' ? 0 : participant.is_us ? 1 : 2)

/** Winner first, then the company's own bid, then the rest in the order the API gives them. */
export function orderParticipants(participants: Participant[]): Participant[] {
  return participants.toSorted((a, b) => rank(a) - rank(b))
}

/** Claims about a company are shown only with a source, so uncited ones are dropped up front. */
export function withCitations(items: CitedText[]): CitedText[] {
  return items.filter((item) => item.citations.length > 0)
}

export function isCited(item: CitedText | null): item is CitedText {
  return item !== null && item.citations.length > 0
}

/** Bid / estimated value. Prefers the backend's ratio; otherwise works it out if the currencies match. */
export function priceShare(participant: Participant, estimate: MoneyAmount | null): number | null {
  if (participant.price_vs_estimate !== null) return participant.price_vs_estimate
  const bid = participant.bid_price
  if (!bid || !estimate || estimate.amount <= 0 || bid.currency !== estimate.currency) return null
  return bid.amount / estimate.amount
}

/** The participant's files from the tender's document list. Ids the tender doesn't know are skipped. */
export function participantDocuments(
  participant: Participant,
  documents: TenderDocument[],
): TenderDocument[] {
  const byId = new Map(documents.map((document) => [document.document_id, document]))
  return participant.document_ids.flatMap((id) => byId.get(id) ?? [])
}
