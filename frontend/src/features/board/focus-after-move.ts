/** Long enough for the optimistic update; short enough that a stale request never steals focus later. */
const TTL_MS = 2000

let request: { tenderId: string; at: number } | null = null

/**
 * Moving a card to another column remounts it, and keyboard focus is lost with
 * the old element. The card asks here to be focused again once it lands.
 */
export function focusAfterMove(tenderId: string): void {
  request = { tenderId, at: Date.now() }
}

/** True once, for the card that asked, while the request is fresh. */
export function takeFocusRequest(tenderId: string): boolean {
  if (!request || request.tenderId !== tenderId) return false
  const fresh = Date.now() - request.at < TTL_MS
  request = null
  return fresh
}
