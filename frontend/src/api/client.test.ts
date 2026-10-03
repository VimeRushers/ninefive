import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from '@/config'
import { apiFetch, buildUrl, setNetworkErrorRecovery } from './client'

describe('buildUrl', () => {
  it('drops empty values and repeats array keys', () => {
    const url = new URL(
      buildUrl('/board', { profile_id: 1, q: '', region: undefined, tags: ['IT', 'Laptopuri'] }),
    )
    expect(`${url.origin}${url.pathname}`).toBe(`${API_BASE_URL}/board`)
    expect(url.searchParams.get('profile_id')).toBe('1')
    expect(url.searchParams.has('q')).toBe(false)
    expect(url.searchParams.has('region')).toBe(false)
    expect(url.searchParams.getAll('tags')).toEqual(['IT', 'Laptopuri'])
  })
})

describe('apiFetch after a network error', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    setNetworkErrorRecovery(null)
  })

  it('runs the recovery once, then repeats the request', async () => {
    const recover = vi.fn(async () => {})
    setNetworkErrorRecovery(recover)
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const board = await apiFetch<{ cards: unknown[] }>('/board', { query: { profile_id: 1 } })
    expect(recover).toHaveBeenCalledTimes(1)
    expect(board.cards.length).toBeGreaterThan(0)
  })

  it('gives up when the repeated request fails too', async () => {
    const recover = vi.fn(async () => {})
    setNetworkErrorRecovery(recover)
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(apiFetch('/board')).rejects.toThrow('Failed to fetch')
    expect(recover).toHaveBeenCalledTimes(1)
  })

  it('fails straight away without a recovery (real backend)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(apiFetch('/board')).rejects.toThrow('Failed to fetch')
  })
})
