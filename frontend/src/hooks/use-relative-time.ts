import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { IsoDateTime } from '@/api/types'
import { formatRelative } from '@/lib/format'

const TICK_MS = 30 * 1000

/** "5 minutes ago" in the UI language, kept current while the page stays open. */
export function useRelativeTime(iso: IsoDateTime | null): string | null {
  const { i18n } = useTranslation()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [])

  return iso ? formatRelative(iso, i18n.language, now) : null
}
