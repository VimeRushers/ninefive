import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Citation } from '@/api/types'
import { citationHref } from '@/lib/citation'
import { cn } from '@/lib/utils'

/** Opens the cited document in a new tab, at the page when there is one. */
export function CitationLink({ citation, className }: { citation: Citation; className?: string }) {
  const { t } = useTranslation()
  const { document_title: title, page } = citation
  return (
    <a
      href={citationHref(citation)}
      target="_blank"
      rel="noreferrer"
      title={page === null ? t('citation.open', { title }) : t('citation.openPage', { title, page })}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-sm text-xs text-primary underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
    >
      <FileText aria-hidden className="size-3 shrink-0" />
      <span className="truncate">{title}</span>
      {page !== null && <span className="shrink-0 tabular-nums">{t('citation.page', { page })}</span>}
    </a>
  )
}
