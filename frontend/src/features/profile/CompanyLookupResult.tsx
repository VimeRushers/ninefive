import { Building2, Check, LoaderCircle, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { isNotFound } from '@/api/client'
import { useCompanyLookup } from '@/api/profile'
import type { CompanyLookup } from '@/api/types'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { isValidIdnoFormat } from '@/lib/idno'
import { TONE_TILE } from '@/lib/tone'
import { cn } from '@/lib/utils'

interface CompanyLookupResultProps {
  idno: string
  name: string
  regions: string[]
  onFill: (company: CompanyLookup) => void
}

/** What data2b.md knows about the IDNO in the form, with a button to copy it in. */
export function CompanyLookupResult({ idno, name, regions, onFill }: CompanyLookupResultProps) {
  const { t, i18n } = useTranslation('profile')
  const lookup = useCompanyLookup(idno)

  if (!isValidIdnoFormat(idno)) return null
  if (lookup.isPending) {
    return (
      <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
        <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
        {t('lookup.searching')}
      </p>
    )
  }
  if (lookup.isError) {
    return (
      <p
        role="status"
        className="flex animate-pop-in items-start gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-xs text-muted-foreground"
      >
        <SearchX aria-hidden className="mt-px size-3.5 shrink-0" />
        {isNotFound(lookup.error) ? t('lookup.notFound') : t('lookup.failed')}
      </p>
    )
  }

  const company = lookup.data
  const matches =
    name.trim() === company.name && (company.region === null || regions.includes(company.region))
  // A calendar date: read it at noon UTC so no time zone moves it to the day before.
  const registered = company.registered_at && formatDate(`${company.registered_at}T12:00:00Z`, i18n.language)
  const rows: [string, ReactNode][] = [
    [t('company.idno'), company.idno],
    [t('lookup.legalForm'), company.legal_form],
    [t('lookup.address'), company.address],
    [t('lookup.registered'), registered],
  ]

  return (
    <section
      aria-label={t('lookup.found', { source: company.source })}
      className="animate-pop-in rounded-xl border bg-surface-2 p-3.5"
    >
      <div className="flex items-start gap-3">
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', TONE_TILE.accent)}>
          <Building2 aria-hidden className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{t('lookup.found', { source: company.source })}</p>
          <p className="text-sm font-bold break-words">{company.name}</p>
        </div>
      </div>

      <dl className="mt-3 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-faint">{label}</dt>
              <dd className="font-semibold break-words text-ink-2">{value}</dd>
            </div>
          ))}
        {company.activities.length > 0 && (
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-faint">{t('lookup.activities')}</dt>
            <dd>
              <ul className="mt-0.5 grid gap-0.5 font-semibold text-ink-2">
                {company.activities.map((activity) => (
                  <li key={activity}>{activity}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-3 border-t pt-3">
        {matches ? (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-good-ink">
            <Check aria-hidden className="size-3.5 shrink-0" />
            {t('lookup.matches')}
          </p>
        ) : (
          <Button type="button" size="sm" className="h-8 rounded-lg" onClick={() => onFill(company)}>
            {t('lookup.fill', { source: company.source })}
          </Button>
        )}
      </div>
    </section>
  )
}
