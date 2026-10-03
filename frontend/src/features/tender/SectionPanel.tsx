import { type ReactNode, useId } from 'react'
import { Panel, PanelHeader } from '@/components/shared/Panel'

interface SectionPanelProps {
  title: string
  actions?: ReactNode
  className?: string
  children: ReactNode
}

/** A Panel named by its heading, so screen readers can jump between the sections of the tab. */
export function SectionPanel({ title, actions, className, children }: SectionPanelProps) {
  const titleId = useId()
  return (
    <Panel aria-labelledby={titleId} className={className}>
      <PanelHeader title={<span id={titleId}>{title}</span>} actions={actions} />
      {children}
    </Panel>
  )
}
