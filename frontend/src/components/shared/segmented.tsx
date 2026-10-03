import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { useSlidingPill } from '@/hooks/use-sliding-pill'
import { cn } from '@/lib/utils'

const containerClass =
  'relative inline-flex max-w-full overflow-x-auto rounded-xl border bg-card p-1 shadow-soft'

const itemClass = (active: boolean) =>
  cn(
    'relative z-10 inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
    active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
  )

function Pill({ pill }: { pill: { left: number; width: number } | null }) {
  if (!pill) return null
  return (
    <span
      aria-hidden
      className="absolute top-1 bottom-1 left-0 rounded-lg bg-primary shadow-soft transition-[transform,width] duration-[360ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{ width: pill.width, transform: `translateX(${pill.left}px)` }}
    />
  )
}

interface SegmentedNavProps {
  label: string
  items: { to: string; label: string }[]
  activeIndex: number
  className?: string
}

/** Tabs that are links, as a segmented control; the green pill slides to the active tab. */
export function SegmentedNav({ label, items, activeIndex, className }: SegmentedNavProps) {
  const { containerRef, itemRef, pill } = useSlidingPill<HTMLElement, HTMLAnchorElement>(activeIndex)
  return (
    <nav ref={containerRef} aria-label={label} className={cn(containerClass, className)}>
      <Pill pill={pill} />
      {items.map((item, index) => (
        <Link
          key={item.to}
          ref={itemRef(index)}
          to={item.to}
          aria-current={index === activeIndex ? 'page' : undefined}
          className={itemClass(index === activeIndex)}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

interface SegmentedControlProps<V extends string> {
  label: string
  options: { value: V; label: string; icon?: LucideIcon }[]
  value: V
  onChange: (value: V) => void
  className?: string
}

/** A choice between a few options, e.g. board or list view. */
export function SegmentedControl<V extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<V>) {
  const activeIndex = options.findIndex((option) => option.value === value)
  const { containerRef, itemRef, pill } = useSlidingPill<HTMLDivElement, HTMLButtonElement>(activeIndex)
  return (
    <div ref={containerRef} role="group" aria-label={label} className={cn(containerClass, className)}>
      <Pill pill={pill} />
      {options.map((option, index) => {
        const Icon = option.icon
        return (
          <button
            key={option.value}
            ref={itemRef(index)}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
            className={itemClass(option.value === value)}
          >
            {Icon && <Icon aria-hidden className="size-4" />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
