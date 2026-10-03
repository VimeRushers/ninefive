import { describe, expect, it } from 'vitest'
import { isValidIdnoFormat } from './idno'

describe('isValidIdnoFormat', () => {
  it('accepts exactly 13 digits', () => {
    expect(isValidIdnoFormat('1003600012345')).toBe(true)
  })

  it('rejects other lengths and non-digits', () => {
    expect(isValidIdnoFormat('')).toBe(false)
    expect(isValidIdnoFormat('100360001234')).toBe(false)
    expect(isValidIdnoFormat('10036000123456')).toBe(false)
    expect(isValidIdnoFormat('100360001234a')).toBe(false)
    expect(isValidIdnoFormat(' 1003600012345')).toBe(false)
  })
})
