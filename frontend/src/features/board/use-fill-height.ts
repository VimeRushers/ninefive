import { useLayoutEffect, useRef, useState } from 'react'

const DESKTOP = '(min-width: 1024px)'

/**
 * On desktop, sizes an element to reach the bottom of the window, so the board
 * fits on screen and each column scrolls on its own. Returns null on smaller
 * screens, where the page scrolls normally.
 */
export function useFillHeight<T extends HTMLElement>({ bottomGap = 40, minHeight = 420 } = {}) {
  const ref = useRef<T>(null)
  const [height, setHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const desktop = typeof window.matchMedia === 'function' ? window.matchMedia(DESKTOP) : null

    const update = () => {
      if (desktop && !desktop.matches) {
        setHeight(null)
        return
      }
      const top = element.getBoundingClientRect().top + window.scrollY
      setHeight(Math.max(minHeight, Math.round(window.innerHeight - top - bottomGap)))
    }

    update()
    window.addEventListener('resize', update)
    // Content above the board (page header, KPI row) changes height with language and data.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(document.body)
    return () => {
      window.removeEventListener('resize', update)
      observer?.disconnect()
    }
  }, [bottomGap, minHeight])

  return [ref, height] as const
}
