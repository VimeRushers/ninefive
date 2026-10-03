import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Participant } from '@/api/types'
import { renderRoute } from '@/test/render'
import { orderParticipants, priceShare } from './participants'

const T1 = 'ocds-b3wdp1-MD-1759301000001'
const T8 = 'ocds-b3wdp1-MD-1759301000008'
const T9 = 'ocds-b3wdp1-MD-1759301000009'

const competitorsOf = (tenderId: string) => renderRoute(`/tenders/${tenderId}/competitors`)

describe('competitors tab', () => {
  it('explains that bids are not published yet and shows no participants (T1)', async () => {
    competitorsOf(T1)
    expect(
      await screen.findByRole('heading', { name: 'Documentele participanților nu sunt publicate încă' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/abia după deschiderea ofertelor/)).toBeInTheDocument()
    expect(screen.getByText(/Ofertele se deschid după termenul-limită/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Participanți' })).not.toBeInTheDocument()
    expect(screen.queryByText('Puncte forte')).not.toBeInTheDocument()
  })

  it('lists the winner first, then the company, with its rejection reason and the lessons (T8)', async () => {
    competitorsOf(T8)
    const list = await screen.findByRole('region', { name: 'Participanți' })
    expect(screen.getByRole('status')).toHaveTextContent(
      /Analizat pe .+Fișierele participanților nu s-au schimbat/,
    )

    const panels = within(list).getAllByRole('region')
    expect(panels).toHaveLength(3)
    const [winner, us, rapid] = panels
    expect(winner).toBe(within(list).getByRole('region', { name: 'Nexus Birotică SRL' }))
    expect(within(winner).getByText('Câștigător')).toBeInTheDocument()
    // The bid's own files, apart from the citation links that point into them.
    const bidFile = within(winner).getByRole('link', {
      name: 'Oferta tehnică — Nexus Birotică SRL (se deschide într-o filă nouă)',
    })
    expect(bidFile).toHaveAttribute('target', '_blank')
    expect(bidFile).toHaveAttribute('href', expect.stringContaining('mock-document.html'))

    // The company's own bid comes second and carries the "You" badge.
    expect(us).toBe(within(list).getByRole('region', { name: 'TehnoServ Grup SRL Voi' }))
    expect(within(us).getByText('Voi')).toBeInTheDocument()
    expect(within(us).getByText('Respins')).toBeInTheDocument()
    expect(within(us).getByRole('heading', { name: 'Motivul respingerii' })).toBeInTheDocument()
    const reason = within(us)
      .getByText('Oferta nu a inclus certificatul de garanție de 36 de luni cerut la punctul 4.2.')
      .closest('div')
    expect(reason).not.toBeNull()
    expect(
      within(reason as HTMLElement).getByRole('link', {
        name: /Darea de seamă privind procedura de achiziție/,
      }),
    ).toHaveAttribute('href', expect.stringMatching(/#page=4$/))

    expect(rapid).toBe(within(list).getByRole('region', { name: 'Rapid Byte SRL' }))
    expect(within(rapid).getByRole('heading', { name: 'Motivul descalificării' })).toBeInTheDocument()

    // KPIs: winning price as a share of the estimate, and the company's own result.
    expect(screen.getByText(/^86\s*%$/)).toBeInTheDocument()
    expect(screen.getByText('Ofertă respinsă')).toBeInTheDocument()

    const lessons = screen.getByRole('region', { name: 'Ce să faceți diferit la licitații similare' })
    expect(
      within(lessons).getByText(
        'La acest cumpărător, certificatul de garanție de 36 de luni e verificat strict. Atașați-l la oferta tehnică.',
      ),
    ).toBeInTheDocument()
  })

  it('says a re-analysis is running and still shows the previous results (T9)', async () => {
    competitorsOf(T9)
    expect(await screen.findByText('Se analizează fișiere noi sau modificate')).toBeInTheDocument()
    expect(screen.getByText(/Rezultatele de mai jos sunt din analiza anterioară/)).toBeInTheDocument()

    const panels = within(screen.getByRole('region', { name: 'Participanți' })).getAllByRole('region')
    expect(panels).toHaveLength(2)
    expect(panels[0]).toHaveAccessibleName('TehnoServ Grup SRL Voi')
    expect(panels[1]).toHaveAccessibleName('Delta Office Tech SRL')
    expect(
      within(panels[1]).getByText('Prețul ofertei depășea valoarea estimată a contractului.'),
    ).toBeInTheDocument()
    // The changed file is marked in the participant's document list.
    expect(within(panels[1]).getByText('Se analizează')).toBeInTheDocument()
  })
})

const participant = (overrides: Partial<Participant>): Participant => ({
  participant_id: 'p',
  name: 'Test SRL',
  idno: null,
  is_us: false,
  status: 'rejected',
  bid_price: null,
  price_vs_estimate: null,
  rejection_reason: null,
  strengths: [],
  weaknesses: [],
  document_ids: [],
  ...overrides,
})

describe('participants', () => {
  it('orders the winner first, then the company, then the rest as given', () => {
    const ordered = orderParticipants([
      participant({ participant_id: 'a' }),
      participant({ participant_id: 'us', is_us: true }),
      participant({ participant_id: 'b', status: 'under_evaluation' }),
      participant({ participant_id: 'winner', status: 'winner' }),
    ])
    expect(ordered.map((p) => p.participant_id)).toEqual(['winner', 'us', 'a', 'b'])
  })

  it('works out the share of the estimate only when the backend does not give it', () => {
    const estimate = { amount: 200, currency: 'MDL' }
    expect(priceShare(participant({ price_vs_estimate: 0.9 }), estimate)).toBe(0.9)
    expect(priceShare(participant({ bid_price: { amount: 150, currency: 'MDL' } }), estimate)).toBe(0.75)
    expect(priceShare(participant({ bid_price: { amount: 150, currency: 'EUR' } }), estimate)).toBeNull()
    expect(priceShare(participant({ bid_price: { amount: 150, currency: 'MDL' } }), null)).toBeNull()
  })
})
