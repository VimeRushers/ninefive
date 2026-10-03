import { ScrollText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TenderDetail } from '@/api/types'
import { CitedText } from '@/components/shared/CitedText'
import { PanelBody } from '@/components/shared/Panel'
import { PanelMessage } from './PanelMessage'
import { SectionPanel } from './SectionPanel'

/** What the tender asks for, in a few sentences, each with its source. */
export function SummaryPanel({ tender, className }: { tender: TenderDetail; className?: string }) {
  const { t } = useTranslation('tender')
  // CitedText hides uncited claims; leaving them out here avoids empty bullets.
  const items = tender.summary.filter((item) => item.citations.length > 0)

  return (
    <SectionPanel title={t('summary.title')} className={className}>
      <PanelBody>
        {items.length > 0 ? (
          <ul className="space-y-4 text-sm leading-relaxed">
            {items.map((item, index) => (
              <li key={index}>
                <CitedText item={item} />
              </li>
            ))}
          </ul>
        ) : (
          <PanelMessage icon={ScrollText} title={t('summary.empty')} />
        )}
      </PanelBody>
    </SectionPanel>
  )
}
