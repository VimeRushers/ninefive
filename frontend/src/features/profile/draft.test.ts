import { describe, expect, it } from 'vitest'
import type { ProfileOut } from '@/api/types'
import { profile } from '@/mocks/data/profile'
import { changesFrom, completedItems, toDraft, validate } from './draft'

const saved: ProfileOut = structuredClone(profile)

describe('changesFrom', () => {
  it('is empty for an untouched draft', () => {
    expect(changesFrom(saved, toDraft(saved))).toEqual({})
  })

  it('has only the changed fields, in API shape', () => {
    const draft = { ...toDraft(saved), name: '  Alt nume SRL ', annual_turnover: '4000000', budget_max: '' }
    expect(changesFrom(saved, draft)).toEqual({
      name: 'Alt nume SRL',
      annual_turnover: { amount: 4000000, currency: 'MDL' },
      budget_max: null,
    })
  })

  it('sends an empty IDNO as null', () => {
    expect(changesFrom(saved, { ...toDraft(saved), idno: ' ' })).toEqual({ idno: null })
  })
})

describe('validate', () => {
  it('accepts the saved profile', () => {
    expect(validate(toDraft(saved))).toEqual({})
  })

  it('reports each problem on its field', () => {
    const draft = {
      ...toDraft(saved),
      idno: '12345',
      name: ' ',
      description: '',
      annual_turnover: '-1',
      employee_count: '2.5',
      budget_min: '500',
      budget_max: '100',
    }
    expect(validate(draft)).toEqual({
      idno: 'idnoFormat',
      name: 'nameRequired',
      description: 'descriptionRequired',
      annual_turnover: 'notAmount',
      employee_count: 'notWholeNumber',
      budget_max: 'maxBelowMin',
    })
  })
})

describe('completedItems', () => {
  it('counts the catalogue and treats empty fields as missing', () => {
    const draft = { ...toDraft(saved), annual_turnover: '', cpv_codes: [] }
    const done = completedItems(draft, 0)
    expect(
      Object.entries(done)
        .filter(([, isDone]) => !isDone)
        .map(([item]) => item),
    ).toEqual(['cpv', 'turnover', 'catalogue'])
  })

  it('counts zero employees as given', () => {
    expect(completedItems({ ...toDraft(saved), employee_count: '0' }, 1).employees).toBe(true)
  })
})
