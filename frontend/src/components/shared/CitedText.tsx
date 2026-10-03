import type { CitedText as CitedTextData } from '@/api/types'
import { cn } from '@/lib/utils'
import { CitationLink } from './CitationLink'

/**
 * Text with its sources underneath. Renders nothing without a citation,
 * because an uncited AI claim must not be shown as fact.
 */
export function CitedText({ item, className }: { item: CitedTextData; className?: string }) {
  if (item.citations.length === 0) {
    if (import.meta.env.DEV) console.warn('CitedText without citations was hidden:', item.text)
    return null
  }
  return (
    <div className={cn('space-y-1', className)}>
      <p>{item.text}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {item.citations.map((citation, index) => (
          <CitationLink key={`${citation.document_id}-${citation.page}-${index}`} citation={citation} />
        ))}
      </div>
    </div>
  )
}
