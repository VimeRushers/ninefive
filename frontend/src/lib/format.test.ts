import { describe, expect, it } from 'vitest'
import { formatMoney, formatMoneyCompact, formatPercent, formatRelative, localeFor } from './format'

const NOW = Date.parse('2026-10-03T12:00:00Z')
const minutes = (n: number) => new Date(NOW + n * 60 * 1000).toISOString()
const days = (n: number) => new Date(NOW + n * 24 * 60 * 60 * 1000).toISOString()

describe('localeFor', () => {
  it('maps UI languages to Moldovan locales', () => {
    expect(localeFor('ro')).toBe('ro-MD')
    expect(localeFor('ru')).toBe('ru-MD')
    expect(localeFor('en')).toBe('en-GB')
    expect(localeFor('xx')).toBe('ro-MD')
  })
})

describe('formatMoney', () => {
  it('shows whole amounts with the currency code', () => {
    const text = formatMoney({ amount: 340000, currency: 'MDL' }, 'en')
    expect(text).toContain('MDL')
    expect(text).toContain('340,000')
  })
})

describe('formatMoneyCompact', () => {
  it('shortens big amounts in the UI language', () => {
    // Intl separates the parts with non-breaking spaces.
    const plain = (text: string) => text.replace(/\s/g, ' ')
    expect(plain(formatMoneyCompact({ amount: 720000, currency: 'MDL' }, 'ro'))).toBe('720 mii MDL')
    expect(plain(formatMoneyCompact({ amount: 1450000, currency: 'MDL' }, 'en'))).toBe('MDL 1.5M')
  })
})

describe('formatPercent', () => {
  it('rounds a 0..1 share to a whole percent', () => {
    expect(formatPercent(0.4249, 'en')).toBe('42%')
  })
})

describe('formatRelative', () => {
  it('describes past and future times', () => {
    expect(formatRelative(minutes(-5), 'en', NOW)).toBe('5 minutes ago')
    expect(formatRelative(days(3), 'en', NOW)).toBe('in 3 days')
  })

  it('says "now" for the last minute', () => {
    expect(formatRelative(minutes(-0.3), 'en', NOW)).toBe('now')
  })

  it('speaks the UI language', () => {
    expect(formatRelative(days(-1), 'ro', NOW)).toBe('ieri')
  })
})
