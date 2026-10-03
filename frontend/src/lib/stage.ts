import { CircleHelp, EyeOff, Sparkles, ThumbsDown, Trophy, type LucideIcon } from 'lucide-react'
import type { Stage } from '@/api/types'
import type { Tone } from './tone'

export const STAGE_ICON: Record<Stage, LucideIcon> = {
  new: Sparkles,
  questionable: CircleHelp,
  not_interested: EyeOff,
  lost: ThumbsDown,
  won: Trophy,
}

export const STAGE_TONE: Record<Stage, Tone> = {
  new: 'info',
  questionable: 'warning',
  not_interested: 'neutral',
  lost: 'critical',
  won: 'good',
}
