import { describe, expect, it } from 'vitest'
import { LANGUAGES, NAMESPACES, resources } from './resources'

/** Flattens nested messages to { "a.b.c": "text" }. */
function flatten(value: object, prefix = ''): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key
      return typeof child === 'object' && child !== null
        ? Object.entries(flatten(child, path))
        : [[path, String(child)]]
    }),
  )
}

/** Keys with plural suffixes removed, since languages have different plural forms. */
function keysOf(messages: object): string[] {
  const keys = Object.keys(flatten(messages)).map((key) => key.replace(/_(zero|one|two|few|many|other)$/, ''))
  return [...new Set(keys)].sort()
}

describe('translations', () => {
  for (const namespace of NAMESPACES) {
    for (const language of LANGUAGES.filter((language) => language !== 'ro')) {
      it(`${language}/${namespace}.json has the same keys as ro/${namespace}.json`, () => {
        expect(keysOf(resources[language][namespace])).toEqual(keysOf(resources.ro[namespace]))
      })
    }
  }

  it('has no empty strings', () => {
    for (const language of LANGUAGES) {
      for (const namespace of NAMESPACES) {
        const empty = Object.entries(flatten(resources[language][namespace]))
          .filter(([, text]) => text.trim() === '')
          .map(([key]) => key)
        expect(empty, `${language}/${namespace}`).toEqual([])
      }
    }
  })
})
