import { QueryClient } from '@tanstack/react-query'
import { isNotFound } from './client'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        // A 404 will not fix itself, so show the "not found" state right away.
        retry: (failureCount, error) => !isNotFound(error) && failureCount < 2,
      },
    },
  })
}
