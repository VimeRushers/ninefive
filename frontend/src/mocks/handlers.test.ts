import { describe, expect, it } from 'vitest'
import { getBoard, moveCard } from '@/api/board'
import { getBuyerProfile } from '@/api/buyers'
import { ApiError } from '@/api/client'
import { lookupCompany } from '@/api/profile'
import { getCompetitors, getTender } from '@/api/tenders'
import type { Citation, CitedText, Stage } from '@/api/types'
import { STAGES } from '@/api/types'
import { tenders } from './data/tenders'

const T = (n: number) => `ocds-b3wdp1-MD-17593010000${String(n).padStart(2, '0')}`

describe('mock board', () => {
  it('returns every tender, spread over all five stages', async () => {
    const board = await getBoard(1)
    const count = (stage: Stage) => board.cards.filter((card) => card.stage === stage).length

    expect(board.cards).toHaveLength(10)
    expect(Object.fromEntries(STAGES.map((stage) => [stage, count(stage)]))).toEqual({
      new: 3,
      questionable: 3,
      not_interested: 2,
      lost: 1,
      won: 1,
    })
    expect(board.last_sync_at).toBeTruthy()
  })

  it('derives card fields from the tender', async () => {
    const cards = new Map((await getBoard(1)).cards.map((card) => [card.tender_id, card]))

    expect(cards.get(T(5))).toMatchObject({
      red_flag_count: 5,
      eligibility: { met_count: 4, total_count: 6, unknown_count: 1 },
    })
    expect(cards.get(T(3))?.questionable_reasons).toHaveLength(2)
    expect(cards.get(T(4))?.questionable_reasons[0]?.kind).toBe('gray_zone')
    expect(cards.get(T(4))?.win_probability).toBeNull()
    expect(cards.get(T(1))?.questionable_reasons).toEqual([])
    expect(cards.get(T(7))).toMatchObject({ changed_in_last_sync: true, stage_source: 'auto' })
    expect(cards.get(T(10))?.changed_in_last_sync).toBe(true)
    expect(cards.get(T(1))?.changed_in_last_sync).toBe(false)
  })

  it('filters by text, tags, price and region', async () => {
    const ids = async (filters: Parameters<typeof getBoard>[1]) =>
      (await getBoard(1, filters)).cards.map((card) => card.tender_id).sort()

    expect(await ids({ q: 'laptop' })).toEqual([T(1)])
    expect(await ids({ q: 'achizitionarea laptopurilor' })).toEqual([T(1)])
    expect(await ids({ q: 'ПРИНТЕР' })).toEqual([T(2), T(9)])
    expect(await ids({ q: 'ungheni educație' })).toEqual([T(1), T(7), T(8)])
    expect(await ids({ tags: ['Educație', 'IT'] })).toEqual([T(1)])
    expect(await ids({ price_max: 100000 })).toEqual([T(6), T(7)])
    expect(await ids({ region: 'UTA Găgăuzia' })).toEqual([T(2), T(9)])
    expect(await ids({ stages: ['lost', 'won'] })).toEqual([T(8), T(9)])
    expect(await ids({ win_min: 0.5 })).toEqual([T(2)])
    expect(await ids({ win_max: 0.1 })).toEqual([T(5)])
    expect(await ids({ eligibility_min: 1 })).toEqual([T(1), T(10), T(2), T(4), T(8), T(9)].sort())
    expect(await ids({ eligibility_max: 0.6 })).toEqual([T(6)])
  })

  it('moves a card by hand', async () => {
    const card = await moveCard(1, T(1), 'not_interested')
    expect(card).toMatchObject({ stage: 'not_interested', stage_source: 'manual', stage_reason: null })

    const board = await getBoard(1)
    expect(board.cards.find((c) => c.tender_id === T(1))?.stage).toBe('not_interested')
  })

  it('rejects unknown stages and tenders', async () => {
    await expect(moveCard(1, T(1), 'archived' as Stage)).rejects.toMatchObject({ status: 422 })
    await expect(moveCard(1, 'missing', 'new')).rejects.toMatchObject({ status: 404 })
  })
})

describe('mock tenders, buyers and profile', () => {
  it('returns 404 as ApiError for unknown ids', async () => {
    const error = await getTender('missing', 1).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404 })
    await expect(getBuyerProfile('missing')).rejects.toMatchObject({ status: 404 })
    await expect(lookupCompany('1000000000000')).rejects.toMatchObject({ status: 404 })
  })

  it('serves competitor analysis in each state', async () => {
    expect((await getCompetitors(T(1))).state).toBe('no_documents')
    expect((await getCompetitors(T(8))).state).toBe('up_to_date')
    expect((await getCompetitors(T(9))).state).toBe('analyzing')
  })

  it('finds the company by IDNO', async () => {
    expect((await lookupCompany('1009600012346')).source).toBe('data2b.md')
  })
})

describe('mock data integrity', () => {
  for (const { detail, analysis, competitors, questionable_reasons } of tenders) {
    it(`${detail.tender_id}: citations and participant files point at listed documents`, () => {
      const documentIds = new Set(detail.documents.map((d) => d.document_id))
      const fromText = (items: CitedText[]) => items.flatMap((item) => item.citations)
      const citations: Citation[] = [
        ...fromText(detail.summary),
        ...fromText(detail.product_matches.map((m) => m.tender_item)),
        ...fromText(detail.changes.map((c) => c.reason)),
        ...analysis.red_flags.flatMap((flag) => fromText(flag.evidence)),
        ...(analysis.eligibility?.items.flatMap((item) => (item.citation ? [item.citation] : [])) ?? []),
        ...competitors.participants.flatMap((p) =>
          fromText([...p.strengths, ...p.weaknesses, ...(p.rejection_reason ? [p.rejection_reason] : [])]),
        ),
        ...fromText(competitors.lessons),
        ...questionable_reasons.flatMap((reason) =>
          reason.kind === 'gray_zone' ? reason.tender_item.citations : [reason.citation],
        ),
      ]

      // Citations of MTender records (page null, "mtender-" ids) are not tender documents.
      const unknown = citations
        .filter((c) => !c.document_id.startsWith('mtender-') && !documentIds.has(c.document_id))
        .map((c) => c.document_id)
      expect(unknown).toEqual([])

      const participantFiles = competitors.participants.flatMap((p) => p.document_ids)
      expect(participantFiles.filter((id) => !documentIds.has(id))).toEqual([])
    })
  }
})
