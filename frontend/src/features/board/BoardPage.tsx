import { List, SquareKanban } from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { useBoard } from '@/api/board'
import { STAGES } from '@/api/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { SegmentedControl } from '@/components/shared/segmented'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState, QueryState } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { formatMoneyCompact } from '@/lib/format'
import { STAGE_ICON, STAGE_TONE } from '@/lib/stage'
import type { BoardFilters } from '@/api/types'
import { BoardColumns } from './BoardColumns'
import { BoardFilterBar } from './BoardFilterBar'
import { BoardSearch } from './BoardSearch'
import { countFilters, readFilters, writeFilters } from '@/api/board-filters'
import { MoveError } from './MoveError'
import { TenderList } from './TenderList'

type View = 'board' | 'list'
const VIEW_KEY = 'ninefive.board-view'

/** The view from the URL, else the last one used. */
function readView(params: URLSearchParams): View {
  const fromUrl = params.get('view')
  if (fromUrl === 'board' || fromUrl === 'list') return fromUrl
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'board'
  } catch {
    return 'board'
  }
}

/** The tender board: search, filters, KPI cards, and the tenders as columns or a list. */
export function BoardPage() {
  const { t, i18n } = useTranslation('board')
  const { t: tc } = useTranslation()
  const [params, setParams] = useSearchParams()
  const filters = readFilters(params)
  const search = filters.q ?? ''
  const filtered = Boolean(search) || countFilters(filters) > 0
  const view = readView(params)
  const query = useBoard(filters)
  // Filter options come from the whole board, not the filtered results.
  const { data: allTenders } = useBoard()
  const regions = [...new Set(allTenders?.cards.flatMap((card) => (card.region ? [card.region] : [])))].sort()
  const tags = [...new Set(allTenders?.cards.flatMap((card) => card.tags))].sort((a, b) => a.localeCompare(b))

  // Each update reads the current URL, so a debounced search and a filter click can't overwrite each other.
  const patchFilters = useCallback(
    (patch: Partial<BoardFilters>) =>
      setParams((current) => writeFilters(current, { ...readFilters(current), ...patch }), { replace: true }),
    [setParams],
  )
  const setSearch = useCallback((value: string) => patchFilters({ q: value || undefined }), [patchFilters])
  const resetFilters = () =>
    setParams((current) => writeFilters(current, { q: readFilters(current).q }), { replace: true })

  function setView(value: View) {
    try {
      localStorage.setItem(VIEW_KEY, value)
    } catch {
      // Not remembering it is fine.
    }
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set('view', value)
        return next
      },
      { replace: true },
    )
  }

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <BoardSearch
            value={search}
            onChange={setSearch}
            busy={query.isFetching && query.isPlaceholderData}
          />
          {filtered && query.data && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {t('search.results', { count: query.data.cards.length })}
            </p>
          )}
          <SegmentedControl
            label={t('view.label')}
            value={view}
            onChange={setView}
            className="ml-auto"
            options={[
              { value: 'board', label: t('view.board'), icon: SquareKanban },
              { value: 'list', label: t('view.list'), icon: List },
            ]}
          />
        </div>
        <BoardFilterBar
          filters={filters}
          onPatch={patchFilters}
          onReset={resetFilters}
          regions={regions}
          tags={tags}
        />
        <MoveError />

        <QueryState query={query}>
          {(board) => {
            if (board.cards.length === 0 && filtered) {
              return (
                <EmptyState
                  title={search ? t('search.noResults', { query: search }) : t('filters.noResults')}
                  description={search ? t('search.noResultsHint') : t('filters.noResultsHint')}
                  action={
                    <div className="flex flex-wrap gap-2">
                      {search && (
                        <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                          {t('search.clear')}
                        </Button>
                      )}
                      {countFilters(filters) > 0 && (
                        <Button variant="outline" size="sm" onClick={resetFilters}>
                          {t('filters.reset')}
                        </Button>
                      )}
                    </div>
                  }
                />
              )
            }
            // With a stage filter, only those stages get a KPI card and a column.
            const stages = filters.stages?.length
              ? STAGES.filter((stage) => filters.stages?.includes(stage))
              : STAGES
            const byStage = stages.map((stage) => ({
              stage,
              cards: board.cards.filter((card) => card.stage === stage),
            }))
            return (
              <div className="space-y-5">
                <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                  {byStage.map(({ stage, cards }) => {
                    const total = cards.reduce((sum, card) => sum + (card.estimated_value?.amount ?? 0), 0)
                    return (
                      <StatCard
                        key={stage}
                        icon={STAGE_ICON[stage]}
                        tone={STAGE_TONE[stage]}
                        tinted={stage === 'won' || stage === 'lost'}
                        label={tc(`stage.${stage}`)}
                        value={cards.length}
                        hint={t('stats.total', {
                          value: formatMoneyCompact({ amount: total, currency: 'MDL' }, i18n.language),
                        })}
                      />
                    )
                  })}
                </div>
                <div key={view} className="animate-fade-in">
                  {view === 'list' ? <TenderList cards={board.cards} /> : <BoardColumns columns={byStage} />}
                </div>
              </div>
            )
          }}
        </QueryState>
      </div>
    </>
  )
}
