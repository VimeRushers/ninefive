import { Building2, PanelLeftClose, PanelLeftOpen, SquareKanban, X, type LucideIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { useProfile } from '@/api/profile'
import { cn } from '@/lib/utils'
import { BrandMark } from './BrandMark'
import { SyncStatus } from './SyncStatus'

interface NavItem {
  key: string
  to: string
  icon: LucideIcon
  label: 'nav.board' | 'nav.profile'
}

const ITEMS: NavItem[] = [
  { key: 'board', to: '/board', icon: SquareKanban, label: 'nav.board' },
  { key: 'profile', to: '/profile', icon: Building2, label: 'nav.profile' },
]

const ITEM_HEIGHT = 42
const ITEM_GAP = 4

/** Tender and buyer pages are reached from the board, so the board item stays active there. */
function activeIndex(pathname: string): number {
  return pathname.startsWith('/profile') ? 1 : 0
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  /** Phone and tablet: the sidebar is a drawer. */
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { data: profile } = useProfile()
  const active = activeIndex(pathname)

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onCloseMobile()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen, onCloseMobile])

  // Labels fade out on the collapsed desktop sidebar; the drawer always shows them.
  const hideWhenCollapsed = cn(
    'transition-opacity duration-200',
    collapsed && 'lg:pointer-events-none lg:opacity-0',
  )

  return (
    <>
      {mobileOpen && (
        <div
          aria-hidden
          className="fixed inset-0 z-30 animate-fade-in bg-scrim lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        style={{ background: 'var(--side-bg)' }}
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-hidden text-side-ink',
          'transition-[transform,width] duration-[360ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
          'lg:sticky lg:top-0 lg:h-svh lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'lg:w-[76px]' : 'lg:w-64',
        )}
      >
        <div className="flex items-center justify-between gap-2 px-[18px] pt-[22px] pb-[18px]">
          <Link to="/board" onClick={onCloseMobile} className="flex min-w-0 items-center gap-2.5 rounded-lg">
            <BrandMark className="size-9 shrink-0" />
            <span className={cn('min-w-0 leading-tight', hideWhenCollapsed)}>
              <span className="block text-lg font-extrabold tracking-tight text-side-ink-strong">
                {t('app.name')}
              </span>
              <span className="block text-2xs font-semibold tracking-wide text-side-muted">
                {t('app.tagline')}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label={t('nav.closeMenu')}
            className="grid size-8 place-items-center rounded-lg text-side-ink hover:bg-side-hover lg:hidden"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        <nav aria-label={t('nav.label')} className="relative mx-3 flex flex-col gap-1">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 rounded-lg bg-side-active shadow-[0_6px_18px_-8px_rgba(148,189,61,0.55)] transition-transform duration-[360ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ height: ITEM_HEIGHT, transform: `translateY(${active * (ITEM_HEIGHT + ITEM_GAP)}px)` }}
          />
          {ITEMS.map((item, index) => {
            const isActive = index === active
            const Icon = item.icon
            return (
              <Link
                key={item.key}
                to={item.to}
                onClick={onCloseMobile}
                aria-current={isActive ? 'page' : undefined}
                title={collapsed ? t(item.label) : undefined}
                style={{ height: ITEM_HEIGHT }}
                className={cn(
                  'relative flex items-center gap-3 rounded-lg px-3 text-sm font-semibold whitespace-nowrap',
                  'transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-lime focus-visible:outline-none',
                  isActive ? 'text-side-active-ink' : 'hover:bg-side-hover hover:text-side-ink-strong',
                )}
              >
                <Icon aria-hidden className="size-[18px] shrink-0" />
                <span className={cn('truncate', hideWhenCollapsed)}>{t(item.label)}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-side-line px-[18px] pt-3 pb-4">
          <div className={cn('mb-3', hideWhenCollapsed)}>
            <SyncStatus />
          </div>
          <div className={cn('flex items-center gap-2.5', collapsed && 'lg:flex-col')}>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-side-active text-xs font-extrabold text-side-active-ink">
              {profile ? initials(profile.name) : ''}
            </span>
            <Link
              to="/profile"
              onClick={onCloseMobile}
              className={cn('min-w-0 flex-1 leading-tight', collapsed && 'lg:hidden')}
            >
              <span className="block truncate text-[0.8125rem] font-bold text-side-ink-strong">
                {profile?.name}
              </span>
              {profile?.idno && (
                <span className="block truncate text-2xs text-side-muted">IDNO {profile.idno}</span>
              )}
            </Link>
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
              title={collapsed ? t('nav.expand') : t('nav.collapse')}
              className="hidden size-8 shrink-0 place-items-center rounded-lg text-side-muted transition-colors hover:bg-side-hover hover:text-side-ink-strong focus-visible:ring-2 focus-visible:ring-lime focus-visible:outline-none lg:grid"
            >
              {collapsed ? (
                <PanelLeftOpen aria-hidden className="size-4" />
              ) : (
                <PanelLeftClose aria-hidden className="size-4" />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
