import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { BuyerProfile } from './types'

export const buyerKeys = {
  all: ['buyers'] as const,
  profile: (buyerId: string) => ['buyers', buyerId, 'profile'] as const,
}

export function getBuyerProfile(buyerId: string): Promise<BuyerProfile> {
  return apiFetch(`/buyers/${encodeURIComponent(buyerId)}/profile`)
}

export function useBuyerProfile(buyerId: string) {
  return useQuery({
    queryKey: buyerKeys.profile(buyerId),
    queryFn: () => getBuyerProfile(buyerId),
  })
}
