import { API_BASE_URL } from '@/config'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, detail: string) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

type QueryValue = string | number | boolean | null | undefined | readonly (string | number)[]
export type QueryParams = Record<string, QueryValue>

/** Builds a backend URL. Empty values are dropped; arrays repeat the key (?tags=a&tags=b). */
export function buildUrl(path: string, query: QueryParams = {}): string {
  const url = new URL(`${API_BASE_URL}${path}`)
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, String(item))
    } else {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: QueryParams
  /** Sent as JSON, or as multipart when it is FormData. */
  body?: unknown
  signal?: AbortSignal
}

type Recovery = () => Promise<void>

let recovery: Recovery | null = null
let recovering: Promise<void> | null = null

/**
 * Something to run when a request can't reach the server, before trying once
 * more. The mock API uses it: the browser can put the mock service worker to
 * sleep in a background tab, and it wakes up no longer mocking.
 */
export function setNetworkErrorRecovery(next: Recovery | null): void {
  recovery = next
}

/** Requests that fail together share one recovery. */
function recover(run: Recovery): Promise<void> {
  recovering ??= run().finally(() => {
    recovering = null
  })
  return recovering
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, signal } = options
  const isForm = body instanceof FormData
  const send = () =>
    fetch(buildUrl(path, query), {
      method,
      signal,
      headers: body === undefined || isForm ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    })

  let response: Response
  try {
    response = await send()
  } catch (error) {
    // fetch throws TypeError when the server can't be reached (not for HTTP errors or aborts).
    if (!(error instanceof TypeError) || !recovery) throw error
    await recover(recovery)
    response = await send()
  }

  if (!response.ok) throw new ApiError(response.status, await readDetail(response))
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/** FastAPI sends { detail: string }, or { detail: [...] } for validation errors. */
async function readDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown }
    if (typeof body.detail === 'string') return body.detail
    if (body.detail !== undefined) return JSON.stringify(body.detail)
  } catch {
    // Not JSON; fall through to the status text.
  }
  return response.statusText || `HTTP ${response.status}`
}
