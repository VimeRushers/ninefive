import type { IsoDateTime, MoneyAmount } from '@/api/types'

const LOCALES: Record<string, string> = { ro: 'ro-MD', ru: 'ru-MD', en: 'en-GB' }

/** Locale for Intl formatting. Pass i18n.language. */
export function localeFor(language: string): string {
  return LOCALES[language] ?? LOCALES.ro
}

export function formatMoney(money: MoneyAmount, language: string): string {
  return new Intl.NumberFormat(localeFor(language), {
    style: 'currency',
    currency: money.currency,
    currencyDisplay: 'code',
    maximumFractionDigits: 0,
  }).format(money.amount)
}

/** Short form for big numbers in KPI cards: "720 mii MDL", "1,5 mil. MDL". */
export function formatMoneyCompact(money: MoneyAmount, language: string): string {
  return new Intl.NumberFormat(localeFor(language), {
    style: 'currency',
    currency: money.currency,
    currencyDisplay: 'code',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(money.amount)
}

/** 0..1 share as a whole percent. */
export function formatPercent(share: number, language: string): string {
  return new Intl.NumberFormat(localeFor(language), {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(share)
}

export function formatDate(iso: IsoDateTime, language: string): string {
  return new Intl.DateTimeFormat(localeFor(language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatDateTime(iso: IsoDateTime, language: string): string {
  return new Intl.DateTimeFormat(localeFor(language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

/** "3 oct." for a date without time (YYYY-MM-DD), read as a calendar date. */
export function formatShortDate(date: string, language: string): string {
  return new Intl.DateTimeFormat(localeFor(language), {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`))
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
]

/** "5 minutes ago", "in 3 days", "now". Works for past and future times. */
export function formatRelative(iso: IsoDateTime, language: string, now = Date.now()): string {
  const seconds = (Date.parse(iso) - now) / 1000
  const format = new Intl.RelativeTimeFormat(localeFor(language), { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit)
  }
  return format.format(0, 'second')
}
