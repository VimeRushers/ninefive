import { Bot, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useParams } from 'react-router'
import { useTender, useTenderAnalysis } from '@/api/tenders'
import { PageHeader } from '@/components/shared/PageHeader'
import { SegmentedNav } from '@/components/shared/segmented'
import { StageBadge } from '@/components/shared/StageBadge'
import { QueryState } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { TenderKpis } from './TenderKpis'

// The tabs belong to person 3 (details), 4 (competitors) and 5 (integrity).
export function TenderLayout() {
  const { tenderId = '' } = useParams()
  const { pathname } = useLocation()
  const { t } = useTranslation('tender')
  const { t: tb } = useTranslation('board')
  const query = useTender(tenderId)
  const analysis = useTenderAnalysis(tenderId)

  const base = `/tenders/${encodeURIComponent(tenderId)}`
  const activeIndex = pathname.endsWith('/competitors') ? 1 : pathname.endsWith('/integrity') ? 2 : 0

  return (
    <QueryState query={query}>
      {(tender) => (
        <div className="space-y-5">
          <PageHeader
            crumbs={[{ label: tb('title'), to: '/board' }]}
            title={<span lang={tender.language}>{tender.title}</span>}
            documentTitle={tender.title}
            description={
              <Link
                to={`/buyers/${encodeURIComponent(tender.buyer_id)}`}
                className="transition-colors hover:text-foreground hover:underline"
              >
                {tender.buyer_name}
              </Link>
            }
            actions={
              <>
                {tender.stage && <StageBadge stage={tender.stage} />}
                <Button asChild variant="outline" size="sm" className="rounded-lg">
                  <a href={tender.mtender_url} target="_blank" rel="noreferrer">
                    {t('openInMTender')}
                    <ExternalLink aria-hidden />
                  </a>
                </Button>
              </>
            }
          />
          {tender.stage_source === 'auto' && tender.stage_reason && (
            <AutoMoveNote reason={tender.stage_reason} />
          )}
          <TenderKpis tender={tender} analysis={analysis.data} />
          <SegmentedNav
            label={t('tabs.label')}
            activeIndex={activeIndex}
            items={[
              { to: base, label: t('tabs.details') },
              { to: `${base}/competitors`, label: t('tabs.competitors') },
              { to: `${base}/integrity`, label: t('tabs.integrity') },
            ]}
          />
          <div key={pathname} className="animate-page-in">
            <Outlet />
          </div>
        </div>
      )}
    </QueryState>
  )
}

/** Why the system moved the card, so nobody wonders who did it. */
function AutoMoveNote({ reason }: { reason: string }) {
  const { t } = useTranslation('tender')
  return (
    <p className="flex animate-fade-in items-start gap-2.5 rounded-xl border bg-card px-4 py-2.5 text-sm text-ink-2 shadow-soft">
      <Bot aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      {t('autoMoved', { reason })}
    </p>
  )
}
