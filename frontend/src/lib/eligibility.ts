import type { EligibilitySummary } from '@/api/types'

/**
 * Share of checkable requirements that are met, 0..1.
 * Requirements that could not be checked (not found in the documents, or no
 * profile data) are left out rather than counted as failures. Null when nothing
 * could be checked.
 */
export function eligibilityPercent(summary: EligibilitySummary | null): number | null {
  if (!summary) return null
  const checkable = summary.total_count - summary.unknown_count
  if (checkable <= 0) return null
  return summary.met_count / checkable
}
