import { Banknote, CalendarClock, ListChecks, ShieldAlert, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TenderAnalysis, TenderDetail } from '@/api/types'
import { StatCard } from '@/components/shared/StatCard'
import { formatDateTime, formatMoney, formatMoneyCompact, formatPercent, formatRelative } from '@/lib/format'

/** Key numbers above the tabs. Shows dashes until the analysis loads. */
export function TenderKpis({ tender, analysis }: { tender: TenderDetail; analysis?: TenderAnalysis }) {
  const { t, i18n } = useTranslation('tender')
  const language = i18n.language
  const eligibility = analysis?.eligibility
  const unknown = eligibility?.items.filter((item) => item.met === null).length ?? 0
  const allMet = eligibility && eligibility.met_count === eligibility.total_count - unknown
  const probability = analysis?.win_chance?.estimated_probability ?? null
  const signals = analysis?.red_flags.filter((flag) => flag.triggered).length
  const text = (value: string) => <span className="text-base font-bold">{value}</span>

  return (
    <div className="stagger grid grid-cols-2 gap-3 xl:grid-cols-5">
      <StatCard
        icon={Banknote}
        tone="accent"
        label={t('kpi.value')}
        value={
          tender.estimated_value
            ? formatMoneyCompact(tender.estimated_value, language)
            : text(t('kpi.noValue'))
        }
        hint={tender.estimated_value ? formatMoney(tender.estimated_value, language) : undefined}
      />
      <StatCard
        icon={CalendarClock}
        tone="info"
        label={t('kpi.deadline')}
        value={tender.deadline ? formatRelative(tender.deadline, language) : '—'}
        hint={tender.deadline ? formatDateTime(tender.deadline, language) : undefined}
      />
      <StatCard
        icon={ListChecks}
        tone={allMet ? 'good' : 'warning'}
        label={t('kpi.eligibility')}
        value={
          eligibility
            ? t('kpi.eligibilityValue', { met: eligibility.met_count, total: eligibility.total_count })
            : '—'
        }
        hint={unknown > 0 ? t('kpi.notChecked', { count: unknown }) : undefined}
      />
      <StatCard
        icon={Target}
        tone="accent"
        label={t('kpi.winChance')}
        value={
          probability === null
            ? analysis
              ? text(t('kpi.notEnoughData'))
              : '—'
            : formatPercent(probability, language)
        }
      />
      <StatCard
        icon={ShieldAlert}
        tone={signals ? 'serious' : 'neutral'}
        tinted={Boolean(signals)}
        label={t('kpi.signals')}
        value={signals ?? '—'}
      />
    </div>
  )
}
