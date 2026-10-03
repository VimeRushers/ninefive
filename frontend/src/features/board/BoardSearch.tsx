import { LoaderCircle, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const DEBOUNCE_MS = 250

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

interface BoardSearchProps {
  /** The search applied to the board (from the URL). */
  value: string
  onChange: (value: string) => void
  /** Shows a spinner while results for new text load. */
  busy?: boolean
}

/** Search as you type. "/" focuses it from anywhere on the page; Esc clears it. */
export function BoardSearch({ value, onChange, busy }: BoardSearchProps) {
  const { t } = useTranslation('board')
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(value)
  const [syncedValue, setSyncedValue] = useState(value)

  // Follow outside changes, e.g. the back button (adjusting state during render, as React recommends).
  if (value !== syncedValue) {
    setSyncedValue(value)
    setText(value)
  }

  useEffect(() => {
    if (text.trim() === value) return
    const id = setTimeout(() => onChange(text.trim()), DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [text, value, onChange])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '/' && !isTyping(event.target)) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const clear = () => {
    setText('')
    onChange('')
    inputRef.current?.focus()
  }

  return (
    <div role="search" className="relative w-full max-w-xl min-w-0">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={inputRef}
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && text) {
            event.preventDefault()
            clear()
          }
        }}
        aria-label={t('search.label')}
        placeholder={t('search.placeholder')}
        title={t('search.shortcut')}
        className="h-11 w-full rounded-xl border bg-card pr-20 pl-10 text-sm shadow-soft transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-faint focus:border-primary focus:ring-3 focus:ring-ring/30 [&::-webkit-search-cancel-button]:appearance-none"
      />
      <div className="absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center gap-1.5">
        {busy && <LoaderCircle aria-hidden className="size-4 animate-spin text-muted-foreground" />}
        {text ? (
          <button
            type="button"
            onClick={clear}
            aria-label={t('search.clear')}
            className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X aria-hidden className="size-4" />
          </button>
        ) : (
          <kbd className="hidden rounded-md border bg-surface-2 px-1.5 py-0.5 text-2xs font-semibold text-muted-foreground sm:inline">
            /
          </kbd>
        )}
      </div>
    </div>
  )
}
