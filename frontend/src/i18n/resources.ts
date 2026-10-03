import enAnalyzer from './locales/en/analyzer.json'
import enBoard from './locales/en/board.json'
import enCommon from './locales/en/common.json'
import enIntegrity from './locales/en/integrity.json'
import enProfile from './locales/en/profile.json'
import enTender from './locales/en/tender.json'
import roAnalyzer from './locales/ro/analyzer.json'
import roBoard from './locales/ro/board.json'
import roCommon from './locales/ro/common.json'
import roIntegrity from './locales/ro/integrity.json'
import roProfile from './locales/ro/profile.json'
import roTender from './locales/ro/tender.json'
import ruAnalyzer from './locales/ru/analyzer.json'
import ruBoard from './locales/ru/board.json'
import ruCommon from './locales/ru/common.json'
import ruIntegrity from './locales/ru/integrity.json'
import ruProfile from './locales/ru/profile.json'
import ruTender from './locales/ru/tender.json'

/** UI languages, in the order the switcher shows them. Romanian is the default. */
export const LANGUAGES = ['ro', 'en', 'ru'] as const
export type UiLanguage = (typeof LANGUAGES)[number]
export const DEFAULT_LANGUAGE: UiLanguage = 'ro'

/**
 * One namespace per area, so people working on different areas don't edit the
 * same file. Romanian is the source of truth for keys; a test checks that
 * English and Russian have the same keys.
 */
export const resources = {
  ro: {
    common: roCommon,
    board: roBoard,
    profile: roProfile,
    tender: roTender,
    analyzer: roAnalyzer,
    integrity: roIntegrity,
  },
  en: {
    common: enCommon,
    board: enBoard,
    profile: enProfile,
    tender: enTender,
    analyzer: enAnalyzer,
    integrity: enIntegrity,
  },
  ru: {
    common: ruCommon,
    board: ruBoard,
    profile: ruProfile,
    tender: ruTender,
    analyzer: ruAnalyzer,
    integrity: ruIntegrity,
  },
} as const

export type Namespace = keyof (typeof resources)['ro']
export const NAMESPACES = Object.keys(resources.ro) as Namespace[]

export function isUiLanguage(value: unknown): value is UiLanguage {
  return LANGUAGES.includes(value as UiLanguage)
}
