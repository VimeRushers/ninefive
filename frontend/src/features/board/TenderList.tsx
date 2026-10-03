import { ArrowDown, ArrowUp, ArrowUpDown, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { useMoveCard } from '@/api/board'
import type { BoardCard } from '@/api/types'
import { Panel } from '@/components/shared/Panel'
import { StageBadge } from '@/components/shared/StageBadge'
import { Table, Td, Th, Tr } from '@/components/shared/Table'
import { eligibilityPercent } from '@/lib/eligibility'
import { formatDateTime, formatMoney, formatPercent, formatRelative } from '@/lib/format'
import { CardMenu } from './CardMenu'

type SortKey = 'value' | 'deadline' | 'eligibility' | 'win'
type Sort = { key: SortKey; direction: 'asc' | 'desc' }

const SORT_VALUE: Record<SortKey, (card: BoardCard) => number | null> = {
  value: (card) => card.estimated_value?.amount ?? null,
  deadline: (card) => (card.deadline ? Date.parse(card.deadline) : null),
  eligibility: (card) => eligibilityPercent(card.eligibility),
  win: (card) => card.win_probability,
}

/** Soonest deadline first; biggest first for the rest. */
const FIRST_DIRECTION: Record<SortKey, Sort['direction']> = {
  value: 'desc',
  deadline: 'asc',
  eligibility: 'desc',
  win: 'desc',
}

/** Sorts a copy; cards without a value go last either way. */
function sortCards(cards: BoardCard[], sort: Sort | null): BoardCard[] {
  if (!sort) return cards
  const valueOf = SORT_VALUE[sort.key]
  const sign = sort.direction === 'asc' ? 1 : -1
  return [...cards].sort((a, b) => {
    const x = valueOf(a)
    const y = valueOf(b)
    if (x === null) return y === null ? 0 : 1
    if (y === null) return -1
    return (x - y) * sign
  })
}

/** The board as a sortable table. Without a sort, rows keep the search order (most relevant first). */
export function TenderList({ cards }: { cards: BoardCard[] }) {
  const { t, i18n } = useTranslation('board')
  const navigate = useNavigate()
  const move = useMoveCard()
  const language = i18n.language
  const [sort, setSort] = useState<Sort | null>(null)

  const toggle = (key: SortKey) =>
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: FIRST_DIRECTION[key] },
    )

  const header = (key: SortKey, label: string) => {
    const active = sort?.key === key
    const Icon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown
    return (
      <Th
        numeric
        aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
        className="p-0"
      >
        <button
          type="button"
          onClick={() => toggle(key)}
          className="inline-flex w-full items-center justify-end gap-1 px-[18px] py-2.5 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {label}
          <Icon aria-hidden className={active ? 'size-3.5 text-foreground' : 'size-3.5 opacity-50'} />
        </button>
      </Th>
    )
  }

  return (
    <Panel className="overflow-hidden">
      <Table>
        <thead>
          <tr>
            <Th>{t('list.tender')}</Th>
            <Th>{t('list.stage')}</Th>
            {header('value', t('card.value'))}
            {header('deadline', t('card.deadline'))}
            {header('eligibility', t('card.eligibility'))}
            {header('win', t('card.winChance'))}
            <Th numeric>{t('list.signals')}</Th>
            <Th className="w-0">
              <span className="sr-only">{t('list.actions')}</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {sortCards(cards, sort).map((card) => {
            const href = `/tenders/${encodeURIComponent(card.tender_id)}`
            const eligibility = eligibilityPercent(card.eligibility)
            return (
              <Tr
                key={card.tender_id}
                onClick={(event) => {
                  // Links and the menu handle their own clicks. Menu items render in a portal,
                  // outside the row in the page but inside it for React events.
                  const target = event.target
                  if (!(target instanceof Element) || !event.currentTarget.contains(target)) return
                  if (!target.closest('a, button')) void navigate(href)
                }}
                className="cursor-pointer"
              >
                <Td className="min-w-72 py-3">
                  <div className="flex items-start gap-2">
                    <Link
                      to={href}
                      className="line-clamp-2 font-bold text-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {card.title}
                    </Link>
                    {card.changed_in_last_sync && (
                      <span className="shrink-0 rounded-full bg-info-soft px-2 py-px text-2xs font-bold text-info-ink">
                        {t('card.updated')}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{card.buyer_name}</p>
                </Td>
                <Td>
                  <StageBadge stage={card.stage} />
                </Td>
                <Td numeric className="font-semibold whitespace-nowrap">
                  {card.estimated_value ? formatMoney(card.estimated_value, language) : '—'}
                </Td>
                <Td
                  numeric
                  className="whitespace-nowrap"
                  title={card.deadline ? formatDateTime(card.deadline, language) : undefined}
                >
                  {card.deadline ? formatRelative(card.deadline, language) : '—'}
                </Td>
                <Td numeric>{eligibility === null ? '—' : formatPercent(eligibility, language)}</Td>
                <Td numeric>
                  {card.win_probability === null ? '—' : formatPercent(card.win_probability, language)}
                </Td>
                <Td numeric>
                  {card.red_flag_count > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-signal-soft px-2 py-0.5 text-xs font-bold text-signal">
                      <ShieldAlert aria-hidden className="size-3" />
                      {card.red_flag_count}
                    </span>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </Td>
                <Td className="py-1.5 pr-3 pl-0 text-right">
                  <CardMenu
                    card={card}
                    onMove={(stage) => move.mutate({ tenderId: card.tender_id, stage })}
                  />
                </Td>
              </Tr>
            )
          })}
        </tbody>
      </Table>
    </Panel>
  )
}
