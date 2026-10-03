import { ChevronRight } from 'lucide-react'
import { type ReactNode, useContext } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { PageHeaderSlotContext } from '@/components/layout/page-header-context'

interface Crumb {
  label: string
  to?: string
}

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Parent pages, shown above the title. */
  crumbs?: Crumb[]
  /** Buttons or badges on the right of the title. */
  actions?: ReactNode
  /** Sets the browser tab title; defaults to the title when it is a string. */
  documentTitle?: string
}

/** Title block of a page. It renders into the top bar, next to the language and theme controls. */
export function PageHeader({ title, description, crumbs = [], actions, documentTitle }: PageHeaderProps) {
  const slot = useContext(PageHeaderSlotContext)
  const { t } = useTranslation()
  const tabTitle = documentTitle ?? (typeof title === 'string' ? title : undefined)

  const content = (
    <div className="min-w-0 animate-fade-in">
      {tabTitle && <title>{`${tabTitle} | ${t('app.name')}`}</title>}
      {crumbs.length > 0 && (
        <nav aria-label={t('nav.breadcrumb')}>
          <ol className="mb-1 flex flex-wrap items-center gap-1 text-[0.8125rem] text-muted-foreground">
            {crumbs.map((crumb, index) => (
              <li key={index} className="flex items-center gap-1">
                {crumb.to ? (
                  <Link to={crumb.to} className="rounded-sm transition-colors hover:text-foreground">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
                <ChevronRight aria-hidden className="size-3.5" />
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-tight text-balance">{title}</h1>
          {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )

  return slot ? createPortal(content, slot) : null
}
