import { Moon, Sun } from 'lucide-react'
import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { setTheme } from './theme'
import { useTheme } from './use-theme'

export function ThemeToggle() {
  const { t } = useTranslation()
  const theme = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    // Keyboard clicks have no pointer position; grow the circle from the button instead.
    const rect = event.currentTarget.getBoundingClientRect()
    const fromPointer = event.detail > 0
    setTheme(next, {
      x: fromPointer ? event.clientX : rect.left + rect.width / 2,
      y: fromPointer ? event.clientY : rect.top + rect.height / 2,
    })
  }

  const label = next === 'dark' ? t('theme.toDark') : t('theme.toLight')
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-surface-3 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {theme === 'dark' ? <Sun aria-hidden className="size-4" /> : <Moon aria-hidden className="size-4" />}
    </button>
  )
}
