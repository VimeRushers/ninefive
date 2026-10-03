import { flushSync } from 'react-dom'

export type Theme = 'light' | 'dark'
export type ThemePreference = Theme | 'system'

/** Also read by the inline script in index.html, which applies the theme before first paint. */
const STORAGE_KEY = 'ninefive.theme'
const listeners = new Set<() => void>()

const media = (query: string) => (typeof window.matchMedia === 'function' ? window.matchMedia(query) : null)

function systemTheme(): Theme {
  return media('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light'
}

export function getPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark') return value
  } catch {
    // Storage can be blocked; follow the system.
  }
  return 'system'
}

/** The theme on screen right now. */
export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
  for (const listener of listeners) listener()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Applies the saved theme and follows the system while nothing is saved. */
export function initTheme(): void {
  const preference = getPreference()
  apply(preference === 'system' ? systemTheme() : preference)
  media('(prefers-color-scheme: dark)')?.addEventListener('change', () => {
    if (getPreference() === 'system') apply(systemTheme())
  })
}

/**
 * Switches the theme. Given the click position, the new theme grows as a
 * circle from that point, as in QGroup Analytics. Without View Transitions
 * support, or with reduced motion, it switches instantly.
 */
export function setTheme(theme: Theme, origin?: { x: number; y: number }): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Not remembering the choice is fine.
  }

  const reducedMotion = media('(prefers-reduced-motion: reduce)')?.matches
  if (!origin || reducedMotion || typeof document.startViewTransition !== 'function') {
    apply(theme)
    return
  }

  const { x, y } = origin
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
  // flushSync so React finishes re-rendering before the new snapshot is taken.
  const transition = document.startViewTransition(() => flushSync(() => apply(theme)))
  void transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      {
        duration: 520,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        pseudoElement: '::view-transition-new(root)',
      },
    )
  })
}
