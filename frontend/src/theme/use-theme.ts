import { useSyncExternalStore } from 'react'
import { getTheme, subscribe, type Theme } from './theme'

/** The theme on screen, updated when it changes. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => 'light')
}
