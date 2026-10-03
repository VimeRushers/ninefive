import { HttpResponse } from 'msw'
import type { ApiErrorBody } from '@/api/types'
import { API_BASE_URL } from '@/config'
import { db } from '../db'

/** Full URL of a backend path, as the app requests it. */
export const api = (path: string) => `${API_BASE_URL}${path}`

export const errorResponse = (status: number, detail: string) =>
  HttpResponse.json<ApiErrorBody>({ detail }, { status })

export const notFound = (detail: string) => errorResponse(404, detail)

/** The mock has one company; any other profile id is a 404, as the backend would return. */
export function profileExists(profileId: string | readonly string[] | undefined | null): boolean {
  return Number(profileId) === db.profile.id
}
