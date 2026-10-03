import {
  keepPreviousData,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { PROFILE_ID, REFRESH_INTERVAL_MS } from '@/config'
import { apiFetch } from './client'
import { tenderKeys } from './tenders'
import type { BoardCard, BoardFilters, BoardResponse, Stage, StageUpdate } from './types'

export const boardKeys = {
  all: ['board'] as const,
  list: (profileId: number, filters: BoardFilters) => ['board', profileId, filters] as const,
  /** Mutation key, so the page can find the latest move and its error. */
  move: ['board', 'move'] as const,
}

export function getBoard(profileId: number, filters: BoardFilters = {}): Promise<BoardResponse> {
  return apiFetch('/board', { query: { profile_id: profileId, ...filters } })
}

export function moveCard(profileId: number, tenderId: string, stage: Stage): Promise<BoardCard> {
  const body: StageUpdate = { stage }
  return apiFetch(`/board/${encodeURIComponent(tenderId)}`, {
    method: 'PATCH',
    query: { profile_id: profileId },
    body,
  })
}

/** Refetches every few minutes so backend syncs show up without a reload. */
export function useBoard(filters: BoardFilters = {}, profileId = PROFILE_ID) {
  return useQuery({
    queryKey: boardKeys.list(profileId, filters),
    queryFn: () => getBoard(profileId, filters),
    refetchInterval: REFRESH_INTERVAL_MS,
    // Keep showing the old cards while new filters load.
    placeholderData: keepPreviousData,
  })
}

/** The card as the backend will return it after a manual move. */
function withStage(card: BoardCard, stage: Stage): BoardCard {
  return {
    ...card,
    stage,
    stage_source: 'manual',
    stage_reason: null,
    // Reasons only belong to "questionable"; moving back in waits for the server's.
    questionable_reasons: stage === 'questionable' ? card.questionable_reasons : [],
  }
}

/**
 * Manual stage change. The card's stage_source becomes "manual".
 * Optimistic: every cached board shows the card in its new column right away,
 * and goes back if the server refuses.
 */
export function useMoveCard(profileId = PROFILE_ID) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: boardKeys.move,
    mutationFn: ({ tenderId, stage }: { tenderId: string; stage: Stage }) =>
      moveCard(profileId, tenderId, stage),
    onMutate: async ({ tenderId, stage }) => {
      // A refetch already on its way would put the card back in its old column.
      await queryClient.cancelQueries({ queryKey: boardKeys.all })
      const snapshot = queryClient.getQueriesData<BoardResponse>({ queryKey: boardKeys.all })
      queryClient.setQueriesData<BoardResponse>({ queryKey: boardKeys.all }, (board) =>
        board
          ? {
              ...board,
              cards: board.cards.map((card) => (card.tender_id === tenderId ? withStage(card, stage) : card)),
            }
          : board,
      )
      return { snapshot }
    },
    onError: (_error, _variables, context) => {
      for (const [queryKey, board] of context?.snapshot ?? []) queryClient.setQueryData(queryKey, board)
    },
    onSettled: (_card, _error, { tenderId }) =>
      Promise.all([
        // While another move is still on its way, a refetch could show its card in the old column.
        queryClient.isMutating({ mutationKey: boardKeys.move }) === 1
          ? queryClient.invalidateQueries({ queryKey: boardKeys.all })
          : undefined,
        queryClient.invalidateQueries({ queryKey: tenderKeys.tender(tenderId) }),
      ]),
  })
}

/** The error of the latest move, if it failed. A later move that works clears it. */
export function useMoveCardError() {
  const moves = useMutationState({
    filters: { mutationKey: boardKeys.move },
    select: (mutation) => mutation.state,
  })
  const last = moves.at(-1)
  return last?.status === 'error' ? last : null
}
