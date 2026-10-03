/** Color pairs for icon tiles, tinted cards and small badges. */
export type Tone = 'neutral' | 'accent' | 'info' | 'good' | 'warning' | 'serious' | 'critical'

export const TONE_TILE: Record<Tone, string> = {
  neutral: 'bg-surface-3 text-muted-foreground',
  accent: 'bg-accent text-accent-foreground',
  info: 'bg-info-soft text-info-ink',
  good: 'bg-good-soft text-good-ink',
  warning: 'bg-warning-soft text-warning-ink',
  serious: 'bg-serious-soft text-serious-ink',
  critical: 'bg-critical-soft text-critical-ink',
}

/** Card backgrounds for a whole tinted card, e.g. "won" and "lost" totals. */
export const TONE_CARD: Record<Tone, string> = {
  neutral: '',
  accent: 'bg-accent/60',
  info: 'bg-info-soft/60',
  good: 'bg-good-soft/70',
  warning: 'bg-warning-soft/70',
  serious: 'bg-serious-soft/70',
  critical: 'bg-critical-soft/70',
}
