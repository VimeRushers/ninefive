import { describe, expect, it } from 'vitest'
import { countFilters, readFilters, writeFilters } from './board-filters'

describe('board filters in the URL', () => {
  it('reads every filter, including repeated tags and stages', () => {
    const params = new URLSearchParams(
      'q=laptop&published_from=2026-09-01&price_min=1000&price_max=500000&region=r.+Ungheni' +
        '&tags=IT&tags=Educa%C8%9Bie&stages=new&stages=questionable&win_min=0.5&eligibility_min=1&view=list',
    )
    expect(readFilters(params)).toEqual({
      q: 'laptop',
      published_from: '2026-09-01',
      price_min: 1000,
      price_max: 500000,
      region: 'r. Ungheni',
      tags: ['IT', 'Educație'],
      stages: ['new', 'questionable'],
      win_min: 0.5,
      eligibility_min: 1,
    })
  })

  it('drops invalid dates, prices, stages and shares', () => {
    const params = new URLSearchParams(
      'published_to=yesterday&price_min=abc&price_max=-5&stages=archived&win_min=50&eligibility_max=-0.1',
    )
    expect(readFilters(params)).toEqual({})
  })

  it('writes filters back without touching the view', () => {
    const params = new URLSearchParams('view=list&region=old&tags=old&stages=won')
    const next = writeFilters(params, {
      region: 'mun. Bălți',
      tags: ['A', 'B'],
      price_max: 100,
      win_min: 0.25,
    })
    expect(next.get('view')).toBe('list')
    expect(next.get('region')).toBe('mun. Bălți')
    expect(next.getAll('tags')).toEqual(['A', 'B'])
    expect(next.has('stages')).toBe(false)
    expect(next.get('win_min')).toBe('0.25')
    expect(readFilters(writeFilters(next, {}))).toEqual({})
  })

  it('counts filters but not the search text; a min/max pair counts once', () => {
    expect(countFilters({ q: 'x', region: 'r', tags: ['a'], published_from: '2026-01-01' })).toBe(3)
    expect(countFilters({ win_min: 0.2, win_max: 0.8, eligibility_min: 1, stages: ['new'] })).toBe(3)
    expect(countFilters({ q: 'x', tags: [], stages: [] })).toBe(0)
  })
})
