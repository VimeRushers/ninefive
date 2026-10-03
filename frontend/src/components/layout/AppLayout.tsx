import { Menu } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation } from 'react-router'
import { USE_MOCKS } from '@/config'
import { ThemeToggle } from '@/theme/ThemeToggle'
import { LanguageSwitcher } from './LanguageSwitcher'
import { PageHeaderSlotContext } from './page-header-context'
import { Sidebar } from './Sidebar'

const COLLAPSED_KEY = 'ninefive.sidebar-collapsed'

function storedCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

export function AppLayout() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null)
  const [collapsed, setCollapsed] = useState(storedCollapsed)
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  function toggleCollapsed() {
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, String(!value))
      } catch {
        // Not remembering it is fine.
      }
      return !value
    })
  }

  // Animate when moving between pages, not between tabs of the same tender.
  const pageKey = pathname.split('/').slice(0, 3).join('/')

  return (
    <div className="flex min-h-svh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2"
      >
        {t('nav.skip')}
      </a>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={menuOpen}
        onCloseMobile={closeMenu}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* On phones the page title gets its own row under the menu button and controls. */}
        <header className="mx-auto flex w-full max-w-[1680px] flex-wrap items-start gap-3 px-4 pt-5 pb-5 sm:flex-nowrap sm:px-7">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t('nav.openMenu')}
            className="grid size-10 shrink-0 place-items-center rounded-full border bg-card shadow-soft lg:hidden"
          >
            <Menu aria-hidden className="size-4" />
          </button>
          <div ref={setHeaderSlot} className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1" />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {USE_MOCKS && (
              <span
                title={t('demoDataHint')}
                className="hidden rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground sm:inline-flex"
              >
                {t('demoData')}
              </span>
            )}
            <div className="flex items-center gap-0.5 rounded-full border bg-card p-1 shadow-soft">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1680px] px-4 pb-10 sm:px-7">
          <PageHeaderSlotContext value={headerSlot}>
            <div key={pageKey} className="animate-page-in">
              <Outlet />
            </div>
          </PageHeaderSlotContext>
        </main>
      </div>
    </div>
  )
}
