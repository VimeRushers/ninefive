import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Citation } from '@/api/types'
import { CitationLink } from './CitationLink'
import { CitedText } from './CitedText'
import { StageBadge } from './StageBadge'
import { TagChips } from './TagChips'

const citation: Citation = {
  document_id: 'd1',
  document_title: 'Caiet de sarcini',
  url: '/docs/caiet.pdf',
  page: 4,
}

describe('CitationLink', () => {
  it('opens the document at the cited page in a new tab', () => {
    render(<CitationLink citation={citation} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/docs/caiet.pdf#page=4')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveTextContent('Caiet de sarcini')
    expect(link).toHaveTextContent('p. 4')
  })

  it('links to the record itself when there is no page', () => {
    render(<CitationLink citation={{ ...citation, page: null }} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/docs/caiet.pdf')
  })
})

describe('CitedText', () => {
  it('shows the text with its sources', () => {
    render(<CitedText item={{ text: 'Garanție 24 de luni.', citations: [citation] }} />)
    expect(screen.getByText('Garanție 24 de luni.')).toBeInTheDocument()
    expect(screen.getByRole('link')).toBeInTheDocument()
  })

  it('hides a claim that has no citation', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(<CitedText item={{ text: 'Fără sursă.', citations: [] }} />)
    expect(container).toBeEmptyDOMElement()
    warn.mockRestore()
  })
})

describe('StageBadge', () => {
  it('shows the stage name in the UI language', () => {
    render(<StageBadge stage="questionable" />)
    expect(screen.getByText('Discutabil')).toBeInTheDocument()
  })
})

describe('TagChips', () => {
  it('toggles tags when used as a filter', async () => {
    const onToggle = vi.fn()
    render(<TagChips tags={['IT', 'Educație']} selected={['IT']} onToggle={onToggle} />)

    expect(screen.getByRole('button', { name: 'IT' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Educație' }))
    expect(onToggle).toHaveBeenCalledWith('Educație')
  })
})
