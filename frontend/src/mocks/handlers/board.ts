import { delay, http, HttpResponse } from 'msw'
import { readFilters } from '@/api/board-filters'
import type { BoardCard, BoardFilters, BoardResponse, StageUpdate } from '@/api/types'
import { STAGES } from '@/api/types'
import { eligibilityPercent } from '@/lib/eligibility'
import type { MockTender } from '../data/tenders'
import { db } from '../db'
import { api, errorResponse, notFound, profileExists } from './utils'

/** Builds a card from the full tender, the way the backend will. */
export function toBoardCard({ detail, analysis, questionable_reasons }: MockTender): BoardCard {
  const eligibility = analysis.eligibility
  return {
    tender_id: detail.tender_id,
    title: detail.title,
    mtender_url: detail.mtender_url,
    buyer_id: detail.buyer_id,
    buyer_name: detail.buyer_name,
    estimated_value: detail.estimated_value,
    region: detail.region,
    published_at: detail.published_at,
    modified_at: detail.modified_at,
    tender_start_at: detail.tender_start_at,
    deadline: detail.deadline,
    stage: detail.stage ?? 'new',
    stage_source: detail.stage_source ?? 'auto',
    stage_reason: detail.stage_reason,
    questionable_reasons: detail.stage === 'questionable' ? questionable_reasons : [],
    eligibility: eligibility && {
      met_count: eligibility.met_count,
      total_count: eligibility.total_count,
      unknown_count: eligibility.items.filter((item) => item.met === null).length,
    },
    win_probability: analysis.win_chance?.estimated_probability ?? null,
    tags: detail.tags,
    red_flag_count: analysis.red_flags.filter((flag) => flag.triggered).length,
    changed_in_last_sync: detail.changes.some((change) => change.synced_at === db.lastSyncAt),
  }
}

/** Inclusive date range check on the date part of an ISO datetime. A missing date never matches a set range. */
function inRange(iso: string | null, from?: string, to?: string): boolean {
  if (!from && !to) return true
  if (!iso) return false
  const date = iso.slice(0, 10)
  return (!from || date >= from) && (!to || date <= to)
}

/** Lowercase without diacritics, so "achizitionarea" matches "Achiziționarea". */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/**
 * Word search over title, description, buyer, region and tags: every word must
 * appear. The real backend searches by meaning, across Romanian and Russian.
 */
/** Inclusive 0..1 bounds. A missing value never matches a set bound. */
function inShare(value: number | null, min?: number, max?: number): boolean {
  if (min === undefined && max === undefined) return true
  if (value === null) return false
  return (min === undefined || value >= min) && (max === undefined || value <= max)
}

function matches({ detail }: MockTender, card: BoardCard, filters: BoardFilters): boolean {
  const amount = detail.estimated_value?.amount
  const words = normalize(filters.q ?? '')
    .split(/\s+/)
    .filter(Boolean)
  const haystack = normalize(
    [detail.title, detail.description, detail.buyer_name, detail.region ?? '', ...detail.tags].join(' '),
  )

  return (
    words.every((word) => haystack.includes(word)) &&
    inRange(detail.published_at, filters.published_from, filters.published_to) &&
    inRange(detail.modified_at, filters.modified_from, filters.modified_to) &&
    inRange(detail.tender_start_at, filters.start_from, filters.start_to) &&
    (filters.price_min === undefined || (amount !== undefined && amount >= filters.price_min)) &&
    (filters.price_max === undefined || (amount !== undefined && amount <= filters.price_max)) &&
    (!filters.region || detail.region === filters.region) &&
    (filters.tags ?? []).every((tag) => detail.tags.includes(tag)) &&
    (!filters.stages || filters.stages.includes(card.stage)) &&
    inShare(card.win_probability, filters.win_min, filters.win_max) &&
    inShare(eligibilityPercent(card.eligibility), filters.eligibility_min, filters.eligibility_max)
  )
}

export const boardHandlers = [
  http.get(api('/board'), async ({ request }) => {
    await delay()
    const url = new URL(request.url)
    if (!profileExists(url.searchParams.get('profile_id'))) return notFound('Profile not found')
    const filters = readFilters(url.searchParams)
    const body: BoardResponse = {
      profile_id: db.profile.id,
      cards: db.tenders
        .map((tender) => ({ tender, card: toBoardCard(tender) }))
        .filter(({ tender, card }) => matches(tender, card, filters))
        .map(({ card }) => card),
      last_sync_at: db.lastSyncAt,
    }
    return HttpResponse.json(body)
  }),

  http.patch(api('/board/:tenderId'), async ({ params, request }) => {
    await delay()
    if (!profileExists(new URL(request.url).searchParams.get('profile_id'))) {
      return notFound('Profile not found')
    }
    const tender = db.tenders.find((t) => t.detail.tender_id === params.tenderId)
    if (!tender) return notFound('Tender not found')
    const { stage } = (await request.json()) as StageUpdate
    if (!STAGES.includes(stage)) return errorResponse(422, `Unknown stage: ${String(stage)}`)

    tender.detail.stage = stage
    tender.detail.stage_source = 'manual'
    tender.detail.stage_reason = null
    return HttpResponse.json(toBoardCard(tender))
  }),
]
