import { createContext } from 'react'

/** The element in the top bar where pages render their PageHeader. */
export const PageHeaderSlotContext = createContext<HTMLElement | null>(null)
