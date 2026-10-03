import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'

/** Path of mock tender T1..T10. */
const tender = (n: number) => `/tenders/ocds-b3wdp1-MD-17593010000${String(n).padStart(2, '0')}`

/** Panels are regions named by their heading. */
const panel = (name: string) => screen.findByRole('region', { name })

describe('eligibility checklist', () => {
  it('counts what is met, links each requirement to its source and shows the legal disclaimer', async () => {
    renderRoute(tender(5))
    const checklist = await panel('Verificarea eligibilității')

    expect(await within(checklist).findByText('4 din 6 îndeplinite, 1 neverificată')).toBeInTheDocument()
    // 4 met out of the 5 that could be checked. Romanian puts a space before "%".
    expect(within(checklist).getByText('80 %')).toBeInTheDocument()
    expect(within(checklist).getByText('Procesor Intel Core i7-14700')).toBeInTheDocument()
    expect(within(checklist).getAllByText('Tehnică')).toHaveLength(3)

    // Five requirements have a source; the sixth was not found in the documents.
    expect(within(checklist).getAllByRole('link')).toHaveLength(5)
    expect(within(checklist).getByText('Nu apare în documente')).toBeInTheDocument()
    expect(within(checklist).getByRole('note')).toHaveTextContent('nu este consultanță juridică')
  })

  it('lists unmet requirements first', async () => {
    renderRoute(tender(5))
    const checklist = await panel('Verificarea eligibilității')
    const list = await within(checklist).findByRole('list', { name: 'Cerințe' })
    const statuses = within(list)
      .getAllByRole('listitem')
      .map((item) => item.querySelector('.sr-only')?.textContent)
    expect(statuses).toEqual([
      'Neîndeplinită',
      'Neverificată',
      'Îndeplinită',
      'Îndeplinită',
      'Îndeplinită',
      'Îndeplinită',
    ])
  })
})

describe('win chance', () => {
  it('shows the estimate with its explanations and disclaimer', async () => {
    renderRoute(tender(1))
    const winChance = await panel('Șansa de câștig')
    expect(await within(winChance).findByText('42 %')).toBeInTheDocument()
    expect(within(winChance).getByText('3,4')).toBeInTheDocument()
    expect(within(winChance).getByText('88 %')).toBeInTheDocument()
    expect(within(winChance).getByRole('note')).toHaveTextContent('estimată doar din licitațiile trecute')
  })

  it('says when there is not enough data', async () => {
    renderRoute(tender(4))
    const winChance = await panel('Șansa de câștig')
    expect(await within(winChance).findByText('Încă nu sunt destule date')).toBeInTheDocument()
    expect(within(winChance).getAllByText('Fără date')).toHaveLength(2)
    expect(within(winChance).getByText('12 %')).toBeInTheDocument()
  })
})

describe('change history', () => {
  it('shows a change that made the tender irrelevant, with the stage move', async () => {
    renderRoute(tender(7))
    const history = await panel('Istoricul modificărilor')
    expect(within(history).getByText('Nu mai e relevantă')).toBeInTheDocument()
    expect(within(history).getByText('Lotul 1 „Calculatoare” a fost anulat')).toBeInTheDocument()
    expect(
      within(history).getByText(
        'Lotul rămas cere doar licențe Microsoft 365, care nu sunt în catalogul vostru.',
      ),
    ).toBeInTheDocument()
    expect(within(history).getByRole('link', { name: /Modificarea nr\. 1/ })).toBeInTheDocument()
    expect(within(history).getByText('Nou')).toBeInTheDocument()
    expect(within(history).getByText('Fără interes')).toBeInTheDocument()
  })

  it('shows a change that kept the tender relevant', async () => {
    renderRoute(tender(10))
    const history = await panel('Istoricul modificărilor')
    expect(within(history).getByText('Încă e relevantă')).toBeInTheDocument()
    expect(within(history).getByText('neschimbată')).toBeInTheDocument()
  })

  it('says when nothing changed', async () => {
    renderRoute(tender(5))
    const history = await panel('Istoricul modificărilor')
    expect(within(history).getByText('Nicio modificare de la publicare')).toBeInTheDocument()
  })
})

describe('header', () => {
  it('explains an automatic move', async () => {
    renderRoute(tender(7))
    expect(
      await screen.findByText(
        'Mutat automat: A devenit irelevantă: lotul cu calculatoare a fost anulat și au rămas doar licențe software.',
      ),
    ).toBeInTheDocument()
  })

  it('says nothing for a card moved by hand', async () => {
    renderRoute(tender(6))
    await panel('Pe scurt')
    expect(screen.queryByText(/^Mutat automat/)).not.toBeInTheDocument()
  })
})

describe('product match', () => {
  it('shows the closest catalogue item, and says when nothing matches', async () => {
    renderRoute(tender(3))
    const products = await panel('Potrivirea produselor')
    expect(within(products).getByText('1 din 2 găsite în catalog')).toBeInTheDocument()

    const matched = within(products).getByText('Switch Cisco CBS250-24T-4G').closest('tr')!
    expect(matched).toHaveTextContent('92 %')
    expect(matched).toHaveTextContent('Cu 4 % sub estimare')

    const unmatched = within(products)
      .getByText('Punct de acces Wi-Fi 6, montare pe tavan — 40 buc.')
      .closest('tr')!
    expect(unmatched).toHaveTextContent('Nimic din catalogul vostru nu se potrivește')
    expect(within(unmatched).getByRole('link', { name: /Caiet de sarcini/ })).toBeInTheDocument()
  })
})

describe('documents', () => {
  it('groups bid files by participant and marks the company’s own bid', async () => {
    renderRoute(tender(8))
    const documents = await panel('Documente')
    expect(await within(documents).findByText('Nexus Birotică SRL')).toBeInTheDocument()

    const groups = within(documents)
      .getAllByRole('rowheader')
      .map((header) => header.textContent)
    expect(groups).toEqual([
      'Publicate de cumpărător',
      'Nexus Birotică SRL',
      'Rapid Byte SRL',
      'TehnoServ Grup SRLOferta voastră',
    ])

    // Each file sits right under its participant.
    const rows = within(documents)
      .getAllByRole('row')
      .map((row) => row.textContent)
    const rapid = rows.indexOf('Rapid Byte SRL')
    expect(rows[rapid + 1]).toContain('Oferta tehnică — Rapid Byte SRL')
    expect(within(documents).getAllByText('Analizat')).toHaveLength(6)
  })
})
