import { useQuery } from '@tanstack/react-query'
import { PROFILE_ID, REFRESH_INTERVAL_MS } from '@/config'
import { apiFetch } from './client'
import type { CompetitorAnalysis, TenderAnalysis, TenderDetail } from './types'

/** While the competitor analyzer is working, check back this often. */
const ANALYZING_REFRESH_MS = 15 * 1000

export const tenderKeys = {
  all: ['tenders'] as const,
  /** Prefix for everything about one tender. */
  tender: (tenderId: string) => ['tenders', tenderId] as const,
  detail: (tenderId: string, profileId: number) => ['tenders', tenderId, 'detail', profileId] as const,
  analysis: (tenderId: string, profileId: number) => ['tenders', tenderId, 'analysis', profileId] as const,
  competitors: (tenderId: string) => ['tenders', tenderId, 'competitors'] as const,
}

const tenderPath = (tenderId: string) => `/tenders/${encodeURIComponent(tenderId)}`

export function getTender(tenderId: string, profileId: number): Promise<TenderDetail> {
  return apiFetch(tenderPath(tenderId), { query: { profile_id: profileId } })
}

export function getTenderAnalysis(tenderId: string, profileId: number): Promise<TenderAnalysis> {
  return apiFetch(`${tenderPath(tenderId)}/analysis`, { query: { profile_id: profileId } })
}

export function getCompetitors(tenderId: string): Promise<CompetitorAnalysis> {
  return apiFetch(`${tenderPath(tenderId)}/competitors`)
}

export function useTender(tenderId: string, profileId = PROFILE_ID) {
  return useQuery({
    queryKey: tenderKeys.detail(tenderId, profileId),
    queryFn: () => getTender(tenderId, profileId),
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}

export function useTenderAnalysis(tenderId: string, profileId = PROFILE_ID) {
  return useQuery({
    queryKey: tenderKeys.analysis(tenderId, profileId),
    queryFn: () => getTenderAnalysis(tenderId, profileId),
    refetchInterval: REFRESH_INTERVAL_MS,
  })
}

export function useCompetitors(tenderId: string) {
  return useQuery({
    queryKey: tenderKeys.competitors(tenderId),
    queryFn: () => getCompetitors(tenderId),
    refetchInterval: (query) =>
      query.state.data?.state === 'analyzing' ? ANALYZING_REFRESH_MS : REFRESH_INTERVAL_MS,
  })
}
