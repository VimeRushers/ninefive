const env = import.meta.env

/** Backend URL, without a trailing slash. */
export const API_BASE_URL = (env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/+$/, '')

/** Mocks are on unless VITE_API_MOCKS=false. Turn them off once the backend runs. */
export const USE_MOCKS = env.VITE_API_MOCKS !== 'false'

/**
 * The backend pulls MTender every 30 minutes. Refetching more often than that
 * means a change shows up within a couple of minutes of the sync.
 */
export const REFRESH_INTERVAL_MS = 2 * 60 * 1000

/** One company per deployment for now. Replace when there is a sign-up flow. */
export const PROFILE_ID = 1
