import { describe, expect, it } from 'vitest'
import { eligibilityPercent } from './eligibility'

describe('eligibilityPercent', () => {
  it('leaves requirements not found in the documents out of the percentage', () => {
    // 6 met out of 7 that could be checked; 1 was not found.
    expect(eligibilityPercent({ met_count: 6, total_count: 8, unknown_count: 1 })).toBeCloseTo(6 / 7)
  })

  it('is 1 when every checked requirement is met', () => {
    expect(eligibilityPercent({ met_count: 5, total_count: 6, unknown_count: 1 })).toBe(1)
  })

  it('is null when nothing could be checked', () => {
    expect(eligibilityPercent({ met_count: 0, total_count: 3, unknown_count: 3 })).toBeNull()
    expect(eligibilityPercent({ met_count: 0, total_count: 0, unknown_count: 0 })).toBeNull()
  })

  it('is null without a summary', () => {
    expect(eligibilityPercent(null)).toBeNull()
  })
})
