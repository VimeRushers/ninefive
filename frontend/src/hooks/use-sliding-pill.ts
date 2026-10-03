import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Positions a pill under the active item of a segmented control. Re-measures
 * when the language changes or the control resizes (e.g. once the font loads).
 */
export function useSlidingPill<C extends HTMLElement, I extends HTMLElement>(activeIndex: number) {
  const { i18n } = useTranslation()
  const containerRef = useRef<C>(null)
  const itemRefs = useRef<(I | null)[]>([])
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      const item = itemRefs.current[activeIndex]
      if (item) setPill({ left: item.offsetLeft, width: item.offsetWidth })
    }
    measure()
    if (typeof ResizeObserver === 'undefined' || !containerRef.current) return
    const observer = new ResizeObserver(measure)
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [activeIndex, i18n.language])

  const itemRef = (index: number) => (element: I | null) => {
    itemRefs.current[index] = element
  }

  return { containerRef, itemRef, pill }
}
