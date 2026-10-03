import type { Citation } from '@/api/types'

/** Link to the cited document, opening PDFs at the cited page. */
export function citationHref(citation: Citation): string {
  return citation.page === null ? citation.url : `${citation.url}#page=${citation.page}`
}
