import { ArrowUpRight, Ellipsis, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { STAGES, type BoardCard, type Stage } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { STAGE_ICON } from '@/lib/stage'
import { cn } from '@/lib/utils'

interface CardMenuProps {
  card: BoardCard
  onMove: (stage: Stage) => void
  className?: string
}

/** The "⋯" menu on a card and a list row: the keyboard and touch way to move a card. */
export function CardMenu({ card, onMove, className }: CardMenuProps) {
  const { t } = useTranslation('board')
  const { t: tc } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('menu.label', { title: card.title })}
          className={cn('text-muted-foreground hover:text-foreground', className)}
        >
          <Ellipsis aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 shadow-float ring-line">
        <DropdownMenuItem asChild>
          <Link to={`/tenders/${encodeURIComponent(card.tender_id)}`}>
            <ArrowUpRight aria-hidden />
            {t('menu.open')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={card.mtender_url} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden />
            {t('menu.openMtender')}
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('menu.moveTo')}</DropdownMenuLabel>
          {STAGES.filter((stage) => stage !== card.stage).map((stage) => {
            const Icon = STAGE_ICON[stage]
            return (
              <DropdownMenuItem key={stage} onSelect={() => onMove(stage)}>
                <Icon aria-hidden className="text-muted-foreground" />
                {tc(`stage.${stage}`)}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
