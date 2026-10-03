import type { BoardFilters, Stage } from './types'
import { STAGES } from './types'

/**
 * Board filters <-> URL query, in the same format as GET /board.
 * Used by the board page (its own URL) and by the mock API (the request URL).
 */

/** Date filters as [from, to] keys, in the order the filter bar shows them. */
export const DATE_RANGES = {
  published: ['published_from', 'published_to'],
  modified: ['modified_from', 'modified_to'],
  start: ['start_from', 'start_to'],
} as const

export type DateRange = keyof typeof DATE_RANGES
type DateKey = (typeof DATE_RANGES)[DateRange][number]

const DATE_KEYS = Object.values(DATE_RANGES).flat() as DateKey[]
const SHARE_KEYS = ['win_min', 'win_max', 'eligibility_min', 'eligibility_max'] as const
const FILTER_KEYS = [
  'q',
  ...DATE_KEYS,
  'price_min',
  'price_max',
  'region',
  'tags',
  'stages',
  ...SHARE_KEYS,
] as const

const isDate = (value: string | null): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
const isStage = (value: string): value is Stage => (STAGES as readonly string[]).includes(value)

function readNumber(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : undefined
}

/** A 0..1 share, e.g. 0.5 for 50%. */
function readShare(value: string | null): number | undefined {
  const number = readNumber(value)
  return number !== undefined && number <= 1 ? number : undefined
}

/** Filters from a query string. Invalid values are dropped rather than sent on. */
export function readFilters(params: URLSearchParams): BoardFilters {
  const filters: BoardFilters = {}
  const q = params.get('q')?.trim()
  if (q) filters.q = q
  for (const key of DATE_KEYS) {
    const value = params.get(key)
    if (isDate(value)) filters[key] = value
  }
  const priceMin = readNumber(params.get('price_min'))
  const priceMax = readNumber(params.get('price_max'))
  if (priceMin !== undefined) filters.price_min = priceMin
  if (priceMax !== undefined) filters.price_max = priceMax
  const region = params.get('region')
  if (region) filters.region = region
  const tags = params.getAll('tags').filter(Boolean)
  if (tags.length) filters.tags = tags
  const stages = params.getAll('stages').filter(isStage)
  if (stages.length) filters.stages = stages
  for (const key of SHARE_KEYS) {
    const value = readShare(params.get(key))
    if (value !== undefined) filters[key] = value
  }
  return filters
}

/** Writes filters into a query string, keeping unrelated parameters such as the view. */
export function writeFilters(params: URLSearchParams, filters: BoardFilters): URLSearchParams {
  const next = new URLSearchParams(params)
  for (const key of FILTER_KEYS) next.delete(key)
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === '') continue
    if (Array.isArray(value)) for (const item of value) next.append(key, String(item))
    else next.set(key, String(value))
  }
  return next
}

/** How many filters are set, not counting the search text. A min/max pair counts once. */
export function countFilters(filters: BoardFilters): number {
  const set = (...values: unknown[]) =>
    values.some((value) => (Array.isArray(value) ? value.length > 0 : value !== undefined))
  return [
    set(filters.published_from, filters.published_to),
    set(filters.modified_from, filters.modified_to),
    set(filters.start_from, filters.start_to),
    set(filters.price_min, filters.price_max),
    set(filters.region),
    set(filters.tags),
    set(filters.stages),
    set(filters.win_min, filters.win_max),
    set(filters.eligibility_min, filters.eligibility_max),
  ].filter(Boolean).length
}
