import type { LucideIcon } from 'lucide-react'

interface PanelMessageProps {
  icon: LucideIcon
  title: string
  description?: string
}

/** "Nothing here yet" inside a panel. EmptyState draws its own card, which would nest in the panel. */
export function PanelMessage({ icon: Icon, title, description }: PanelMessageProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-3 text-muted-foreground">
        <Icon aria-hidden className="size-4" />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  )
}
