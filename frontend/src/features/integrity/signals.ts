import { Hash, Hourglass, type LucideIcon, Repeat, Ruler, Tag, UserRound } from 'lucide-react'
import { type CitedText, RED_FLAG_INDICATORS, type RedFlag, type RedFlagIndicator } from '@/api/types'

/** One icon per indicator, so a signal is recognizable before its label is read. */
export const INDICATOR_ICON: Record<RedFlagIndicator, LucideIcon> = {
  short_submission_window: Hourglass,
  single_bidder_history: UserRound,
  repeat_winner: Repeat,
  brand_without_equivalent: Tag,
  narrow_tolerances: Ruler,
  cpv_mismatch: Hash,
}

/** These come from the buyer's past tenders, so they link to the buyer page for the full picture. */
export const BUYER_INDICATORS: ReadonlySet<RedFlagIndicator> = new Set<RedFlagIndicator>([
  'single_bidder_history',
  'repeat_winner',
])

/** Evidence that may be shown: an item without a source is never shown. */
export function citedEvidence(flag: RedFlag): CitedText[] {
  return flag.evidence.filter((item) => item.citations.length > 0)
}

/**
 * detected: triggered, with at least one cited piece of evidence.
 * unsupported: triggered, but nothing cited to show. Without evidence it is not presented as a signal.
 * clear: the indicator found nothing.
 */
export type SignalStatus = 'detected' | 'unsupported' | 'clear'

export function signalStatus(flag: RedFlag): SignalStatus {
  if (!flag.triggered) return 'clear'
  return citedEvidence(flag).length > 0 ? 'detected' : 'unsupported'
}

/** Known indicators in their fixed order, whatever order the API sends them in. */
export function orderFlags(flags: RedFlag[]): RedFlag[] {
  return RED_FLAG_INDICATORS.flatMap((code) => flags.filter((flag) => flag.indicator === code))
}
