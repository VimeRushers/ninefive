import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PROFILE_ID } from '@/config'
import { isValidIdnoFormat } from '@/lib/idno'
import { boardKeys } from './board'
import { apiFetch } from './client'
import type {
  CatalogueItem,
  CatalogueItemUpdate,
  CompanyLookup,
  Pricelist,
  ProfileOut,
  ProfileUpdate,
} from './types'

/** While a pricelist is being read, check back this often. */
const PROCESSING_REFRESH_MS = 3 * 1000

export const profileKeys = {
  all: ['profile'] as const,
  detail: (profileId: number) => ['profile', profileId] as const,
  lookup: (idno: string) => ['profile', 'lookup', idno] as const,
  pricelists: (profileId: number) => ['profile', profileId, 'pricelists'] as const,
  catalogue: (profileId: number) => ['profile', profileId, 'catalogue'] as const,
}

export function getProfile(profileId: number): Promise<ProfileOut> {
  return apiFetch(`/profile/${profileId}`)
}

export function updateProfile(profileId: number, update: ProfileUpdate): Promise<ProfileOut> {
  return apiFetch(`/profile/${profileId}`, { method: 'PATCH', body: update })
}

export function lookupCompany(idno: string): Promise<CompanyLookup> {
  return apiFetch('/profile/lookup', { query: { idno } })
}

export function getPricelists(profileId: number): Promise<Pricelist[]> {
  return apiFetch(`/profile/${profileId}/pricelists`)
}

export function uploadPricelist(profileId: number, file: File): Promise<Pricelist> {
  const form = new FormData()
  form.append('file', file)
  return apiFetch(`/profile/${profileId}/pricelists`, { method: 'POST', body: form })
}

export function deletePricelist(profileId: number, pricelistId: number): Promise<void> {
  return apiFetch(`/profile/${profileId}/pricelists/${pricelistId}`, { method: 'DELETE' })
}

export function getCatalogue(profileId: number): Promise<CatalogueItem[]> {
  return apiFetch(`/profile/${profileId}/catalogue`)
}

export function updateCatalogueItem(
  profileId: number,
  itemId: number,
  update: CatalogueItemUpdate,
): Promise<CatalogueItem> {
  return apiFetch(`/profile/${profileId}/catalogue/${itemId}`, { method: 'PATCH', body: update })
}

export function deleteCatalogueItem(profileId: number, itemId: number): Promise<void> {
  return apiFetch(`/profile/${profileId}/catalogue/${itemId}`, { method: 'DELETE' })
}

export function useProfile(profileId = PROFILE_ID) {
  return useQuery({
    queryKey: profileKeys.detail(profileId),
    queryFn: () => getProfile(profileId),
  })
}

/** Profile changes can change which tenders match, so the board is refetched too. */
export function useUpdateProfile(profileId = PROFILE_ID) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (update: ProfileUpdate) => updateProfile(profileId, update),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.detail(profileId), profile)
      return queryClient.invalidateQueries({ queryKey: boardKeys.all })
    },
  })
}

/** Looks the company up once the IDNO has 13 digits. */
export function useCompanyLookup(idno: string) {
  return useQuery({
    queryKey: profileKeys.lookup(idno),
    queryFn: () => lookupCompany(idno),
    enabled: isValidIdnoFormat(idno),
    staleTime: Infinity,
  })
}

export function usePricelists(profileId = PROFILE_ID) {
  return useQuery({
    queryKey: profileKeys.pricelists(profileId),
    queryFn: () => getPricelists(profileId),
    refetchInterval: (query) =>
      query.state.data?.some((pricelist) => pricelist.status === 'processing')
        ? PROCESSING_REFRESH_MS
        : false,
  })
}

export function useCatalogue(profileId = PROFILE_ID) {
  return useQuery({
    queryKey: profileKeys.catalogue(profileId),
    queryFn: () => getCatalogue(profileId),
  })
}

function useInvalidateCatalogue(profileId: number) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: profileKeys.pricelists(profileId) }),
      queryClient.invalidateQueries({ queryKey: profileKeys.catalogue(profileId) }),
      queryClient.invalidateQueries({ queryKey: boardKeys.all }),
    ])
}

export function useUploadPricelist(profileId = PROFILE_ID) {
  const invalidate = useInvalidateCatalogue(profileId)
  return useMutation({
    mutationFn: (file: File) => uploadPricelist(profileId, file),
    onSuccess: invalidate,
  })
}

export function useDeletePricelist(profileId = PROFILE_ID) {
  const invalidate = useInvalidateCatalogue(profileId)
  return useMutation({
    mutationFn: (pricelistId: number) => deletePricelist(profileId, pricelistId),
    onSuccess: invalidate,
  })
}

export function useUpdateCatalogueItem(profileId = PROFILE_ID) {
  const invalidate = useInvalidateCatalogue(profileId)
  return useMutation({
    mutationFn: ({ itemId, update }: { itemId: number; update: CatalogueItemUpdate }) =>
      updateCatalogueItem(profileId, itemId, update),
    onSuccess: invalidate,
  })
}

export function useDeleteCatalogueItem(profileId = PROFILE_ID) {
  const invalidate = useInvalidateCatalogue(profileId)
  return useMutation({
    mutationFn: (itemId: number) => deleteCatalogueItem(profileId, itemId),
    onSuccess: invalidate,
  })
}
