import {
  Banknote,
  CalendarDays,
  Check,
  ChevronDown,
  Layers,
  ListChecks,
  MapPin,
  RotateCcw,
  Tag,
  Target,
  X,
  type LucideIcon,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { countFilters, DATE_RANGES, type DateRange } from '@/api/board-filters'
import type { BoardFilters } from '@/api/types'
import { STAGES } from '@/api/types'
import { StageBadge } from '@/components/shared/StageBadge'
import { TagChips } from '@/components/shared/TagChips'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatMoneyCompact, formatPercent, formatShortDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const inputClass =
  'h-9 w-full rounded-lg border bg-card px-2.5 text-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary focus:ring-3 focus:ring-ring/30'

interface FilterChipProps {
  icon: LucideIcon
  label: string
  /** The current value in words; the chip is highlighted when there is one. */
  summary?: string
  onClear: () => void
  /** Popover width; defaults to 18rem. */
  wide?: boolean
  children: ReactNode | ((close: () => void) => ReactNode)
}

/** A filter button that opens its options in a popover, with an × to clear it. */
function FilterChip({ icon: Icon, label, summary, onClear, wide, children }: FilterChipProps) {
  const { t } = useTranslation('board')
  const [open, setOpen] = useState(false)
  const active = Boolean(summary)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          'inline-flex h-9 max-w-full shrink-0 items-center rounded-lg border text-sm font-semibold shadow-soft transition-colors duration-200',
          active
            ? 'border-transparent bg-accent text-accent-foreground'
            : 'bg-card text-ink-2 hover:bg-surface-2',
        )}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex h-full min-w-0 items-center gap-1.5 rounded-lg pl-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              active ? 'pr-1' : 'pr-2.5',
            )}
          >
            <Icon aria-hidden className="size-4 shrink-0 opacity-70" />
            <span className="whitespace-nowrap">{summary ? `${label}:` : label}</span>
            {summary && <span className="max-w-48 truncate font-bold">{summary}</span>}
            <ChevronDown
              aria-hidden
              className={cn(
                'size-3.5 shrink-0 opacity-60 transition-transform duration-200',
                open && 'rotate-180',
              )}
            />
          </button>
        </PopoverTrigger>
        {active && (
          <button
            type="button"
            onClick={onClear}
            aria-label={t('filters.clearOne', { label })}
            className="mr-1 grid size-6 shrink-0 place-items-center rounded-md transition-colors hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        )}
      </div>
      <PopoverContent
        align="start"
        className={cn(
          'rounded-xl p-3 shadow-float ring-line',
          wide ? 'w-[22rem] max-w-[calc(100vw-2rem)]' : 'w-72',
        )}
      >
        {typeof children === 'function' ? children(() => setOpen(false)) : children}
      </PopoverContent>
    </Popover>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
      {label}
      {children}
    </label>
  )
}

/** Min and max price; applied with the button or Enter so typing doesn't reload the board. */
function PriceForm({
  min,
  max,
  onApply,
}: {
  min?: number
  max?: number
  onApply: (min?: number, max?: number) => void
}) {
  const { t } = useTranslation('board')
  const [low, setLow] = useState(min?.toString() ?? '')
  const [high, setHigh] = useState(max?.toString() ?? '')
  const toNumber = (value: string) => (value.trim() === '' ? undefined : Math.max(0, Number(value)))

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        onApply(toNumber(low), toNumber(high))
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <Field label={t('filters.priceMin')}>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={low}
            onChange={(event) => setLow(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t('filters.priceMax')}>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={high}
            onChange={(event) => setHigh(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <Button type="submit" size="sm" className="h-9 w-full rounded-lg">
        {t('filters.apply')}
      </Button>
    </form>
  )
}

/** Percent bounds (stored as 0..1 shares), with one-click presets for the usual minimums. */
function ShareForm({
  min,
  max,
  presets,
  note,
  onApply,
}: {
  min?: number
  max?: number
  presets: number[]
  note: string
  onApply: (min?: number, max?: number) => void
}) {
  const { t, i18n } = useTranslation('board')
  const asText = (share?: number) => (share === undefined ? '' : String(Math.round(share * 100)))
  const [low, setLow] = useState(asText(min))
  const [high, setHigh] = useState(asText(max))
  const toShare = (value: string) =>
    value.trim() === '' ? undefined : Math.min(100, Math.max(0, Number(value))) / 100

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onApply(preset, undefined)}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              min === preset &&
                max === undefined &&
                'border-transparent bg-primary text-primary-foreground hover:bg-primary',
            )}
          >
            {preset === 1 ? formatPercent(1, i18n.language) : `≥ ${formatPercent(preset, i18n.language)}`}
          </button>
        ))}
      </div>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          onApply(toShare(low), toShare(high))
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('filters.minPercent')}>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={5}
              value={low}
              onChange={(event) => setLow(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={t('filters.maxPercent')}>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={5}
              value={high}
              onChange={(event) => setHigh(event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <Button type="submit" size="sm" className="h-9 w-full rounded-lg">
          {t('filters.apply')}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  )
}

interface BoardFilterBarProps {
  filters: BoardFilters
  /** Changes some filters; undefined removes one. */
  onPatch: (patch: Partial<BoardFilters>) => void
  onReset: () => void
  /** Options, taken from the unfiltered board. */
  regions: string[]
  tags: string[]
}

export function BoardFilterBar({ filters, onPatch, onReset, regions, tags }: BoardFilterBarProps) {
  const { t, i18n } = useTranslation('board')
  const { t: tc } = useTranslation()
  const language = i18n.language
  const money = (amount: number) => formatMoneyCompact({ amount, currency: 'MDL' }, language)
  const date = (value: string) => formatShortDate(value, language)

  function dateSummary(from?: string, to?: string): string | undefined {
    if (from && to) return `${date(from)} – ${date(to)}`
    if (from) return t('filters.since', { date: date(from) })
    if (to) return t('filters.until', { date: date(to) })
    return undefined
  }

  const { price_min: priceMin, price_max: priceMax } = filters
  const priceSummary =
    priceMin !== undefined && priceMax !== undefined
      ? `${money(priceMin)} – ${money(priceMax)}`
      : priceMin !== undefined
        ? t('filters.atLeast', { value: money(priceMin) })
        : priceMax !== undefined
          ? t('filters.atMost', { value: money(priceMax) })
          : undefined

  const percent = (share: number) => formatPercent(share, language)
  function shareSummary(min?: number, max?: number): string | undefined {
    if (min !== undefined && max !== undefined) return `${percent(min)} – ${percent(max)}`
    if (min !== undefined) return min === 1 ? percent(1) : `≥ ${percent(min)}`
    if (max !== undefined) return `≤ ${percent(max)}`
    return undefined
  }

  const selectedStages = filters.stages ?? []
  const stageSummary =
    selectedStages.length === 0
      ? undefined
      : selectedStages.length === 1
        ? tc(`stage.${selectedStages[0]}`)
        : `${tc(`stage.${selectedStages[0]}`)} +${selectedStages.length - 1}`

  const selectedTags = filters.tags ?? []
  const tagSummary =
    selectedTags.length === 0
      ? undefined
      : selectedTags.length === 1
        ? selectedTags[0]
        : `${selectedTags[0]} +${selectedTags.length - 1}`

  return (
    // One scrolling row on phones, wrapping rows on wider screens.
    <div
      role="group"
      aria-label={t('filters.label')}
      className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
    >
      <FilterChip
        icon={Layers}
        label={t('filters.stage')}
        summary={stageSummary}
        onClear={() => onPatch({ stages: undefined })}
      >
        <ul className="-m-1 grid gap-0.5">
          {STAGES.map((stage) => {
            const selected = selectedStages.includes(stage)
            return (
              <li key={stage}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    // Keep the board's column order whatever the click order.
                    const next = STAGES.filter((s) => (s === stage ? !selected : selectedStages.includes(s)))
                    onPatch({ stages: next.length ? next : undefined })
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <StageBadge stage={stage} />
                  {selected && <Check aria-hidden className="size-4 text-primary" />}
                </button>
              </li>
            )
          })}
        </ul>
      </FilterChip>

      {(Object.keys(DATE_RANGES) as DateRange[]).map((range) => {
        const [fromKey, toKey] = DATE_RANGES[range]
        const from = filters[fromKey]
        const to = filters[toKey]
        const setDate = (key: typeof fromKey | typeof toKey, value: string) => {
          const patch: Partial<BoardFilters> = {}
          patch[key] = value || undefined
          onPatch(patch)
        }
        return (
          <FilterChip
            key={range}
            icon={CalendarDays}
            label={t(`filters.${range}`)}
            summary={dateSummary(from, to)}
            wide
            onClear={() => {
              const patch: Partial<BoardFilters> = {}
              patch[fromKey] = undefined
              patch[toKey] = undefined
              onPatch(patch)
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('filters.from')}>
                <input
                  type="date"
                  value={from ?? ''}
                  max={to}
                  onChange={(event) => setDate(fromKey, event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label={t('filters.to')}>
                <input
                  type="date"
                  value={to ?? ''}
                  min={from}
                  onChange={(event) => setDate(toKey, event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </FilterChip>
        )
      })}

      <FilterChip
        icon={Banknote}
        label={t('filters.price')}
        summary={priceSummary}
        onClear={() => onPatch({ price_min: undefined, price_max: undefined })}
      >
        {(close) => (
          <PriceForm
            min={priceMin}
            max={priceMax}
            onApply={(min, max) => {
              onPatch({ price_min: min, price_max: max })
              close()
            }}
          />
        )}
      </FilterChip>

      <FilterChip
        icon={ListChecks}
        label={t('filters.eligibility')}
        summary={shareSummary(filters.eligibility_min, filters.eligibility_max)}
        onClear={() => onPatch({ eligibility_min: undefined, eligibility_max: undefined })}
      >
        {(close) => (
          <ShareForm
            min={filters.eligibility_min}
            max={filters.eligibility_max}
            presets={[1, 0.75, 0.5]}
            note={t('filters.eligibilityNote')}
            onApply={(min, max) => {
              onPatch({ eligibility_min: min, eligibility_max: max })
              close()
            }}
          />
        )}
      </FilterChip>

      <FilterChip
        icon={Target}
        label={t('filters.winChance')}
        summary={shareSummary(filters.win_min, filters.win_max)}
        onClear={() => onPatch({ win_min: undefined, win_max: undefined })}
      >
        {(close) => (
          <ShareForm
            min={filters.win_min}
            max={filters.win_max}
            presets={[0.25, 0.5, 0.75]}
            note={t('filters.winNote')}
            onApply={(min, max) => {
              onPatch({ win_min: min, win_max: max })
              close()
            }}
          />
        )}
      </FilterChip>

      <FilterChip
        icon={MapPin}
        label={t('filters.region')}
        summary={filters.region}
        onClear={() => onPatch({ region: undefined })}
      >
        {(close) => (
          <ul className="-m-1 grid gap-0.5">
            {[undefined, ...regions].map((region) => {
              const selected = filters.region === region
              return (
                <li key={region ?? 'all'}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      onPatch({ region })
                      close()
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                      selected && 'font-bold',
                    )}
                  >
                    {region ?? t('filters.allRegions')}
                    {selected && <Check aria-hidden className="size-4 text-primary" />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </FilterChip>

      <FilterChip
        icon={Tag}
        label={t('filters.tags')}
        summary={tagSummary}
        onClear={() => onPatch({ tags: undefined })}
      >
        <TagChips
          tags={tags}
          selected={selectedTags}
          label={t('filters.tags')}
          onToggle={(tag) => {
            const next = selectedTags.includes(tag)
              ? selectedTags.filter((selected) => selected !== tag)
              : [...selectedTags, tag]
            onPatch({ tags: next.length ? next : undefined })
          }}
        />
      </FilterChip>

      {countFilters(filters) > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-9 shrink-0 rounded-lg text-muted-foreground"
        >
          <RotateCcw aria-hidden />
          {t('filters.reset')}
        </Button>
      )}
    </div>
  )
}
