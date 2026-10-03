import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { RED_FLAG_INDICATORS, type TenderAnalysis } from '@/api/types'
import { api } from '@/mocks/handlers/utils'
import { server } from '@/mocks/node'
import { renderRoute } from '@/test/render'

const T1 = 'ocds-b3wdp1-MD-1759301000001'
const T5 = 'ocds-b3wdp1-MD-1759301000005'

const LABELS = {
  short_submission_window: 'Termen scurt de depunere',
  single_bidder_history: 'Adesea un singur ofertant',
  repeat_winner: 'Același furnizor câștigă des',
  brand_without_equivalent: 'Marcă fără „sau echivalent”',
  narrow_tolerances: 'Toleranțe foarte înguste',
  cpv_mismatch: 'Cod CPV nepotrivit',
}

const BUYER_AWARDS = 'MTender: contractele atribuite de cumpărător, 2023–2026'

/** The five T5 signals, each with its evidence and the source every piece cites. */
const T5_SIGNALS: { label: string; evidence: [text: string, source: string, href: string][] }[] = [
  {
    label: LABELS.short_submission_window,
    evidence: [
      ['Ofertele se depun în 6 zile de la publicare.', 'Anunț de participare', '#page=1'],
      [
        'La licitațiile similare din ultimii 2 ani, termenul median a fost de 21 de zile.',
        'MTender: licitații similare (CPV 30213000-5), 2024–2026',
        'mock-document.html',
      ],
    ],
  },
  {
    label: LABELS.single_bidder_history,
    evidence: [
      [
        '25 din cele 39 de licitații ale cumpărătorului din 2023 încoace (64%) au primit o singură ofertă.',
        BUYER_AWARDS,
        'mock-document.html',
      ],
    ],
  },
  {
    label: LABELS.repeat_winner,
    evidence: [
      [
        'Același furnizor a câștigat 7 din ultimele 9 contracte ale acestui cumpărător.',
        BUYER_AWARDS,
        'mock-document.html',
      ],
    ],
  },
  {
    label: LABELS.brand_without_equivalent,
    evidence: [
      [
        'Caietul de sarcini cere „procesor Intel Core i7-14700” fără mențiunea „sau echivalent”.',
        'Caiet de sarcini',
        '#page=3',
      ],
    ],
  },
  {
    label: LABELS.narrow_tolerances,
    evidence: [
      [
        'Monitorul trebuie să aibă diagonala de exact 23,8", fără nicio toleranță.',
        'Caiet de sarcini',
        '#page=4',
      ],
    ],
  },
]

const integrityTab = (tenderId: string) => `/tenders/${tenderId}/integrity`

describe('integrity signals', () => {
  it('shows the five T5 signals with their cited evidence', async () => {
    renderRoute(integrityTab(T5))
    expect(
      await screen.findByRole('heading', { name: '5 semnale detectate din 6 indicatori verificați' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/nu dovezi ale unor încălcări/)).toBeInTheDocument()

    for (const { label, evidence } of T5_SIGNALS) {
      const card = screen.getByRole('region', { name: label })
      expect(within(card).getByText('Detectat')).toBeInTheDocument()
      for (const [text, source, href] of evidence) {
        const item = within(card).getByText(text).closest('li')
        expect(item, text).not.toBeNull()
        const link = within(item as HTMLElement).getByRole('link', { name: (name) => name.includes(source) })
        expect(link.getAttribute('href')).toContain(href)
        expect(link).toHaveAttribute('target', '_blank')
      }
    }
  })

  it('lists the CPV check as not detected for T5', async () => {
    renderRoute(integrityTab(T5))
    const list = await screen.findByRole('region', { name: 'Indicatori fără semnal' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(within(list).getByText(LABELS.cpv_mismatch)).toBeInTheDocument()
    expect(within(list).getByText('Nedetectat')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: LABELS.cpv_mismatch })).not.toBeInTheDocument()
  })

  it('shows no signals for T1 and lists all six indicators as not detected', async () => {
    renderRoute(integrityTab(T1))
    expect(
      await screen.findByRole('heading', { name: '6 indicatori verificați, niciun semnal detectat' }),
    ).toBeInTheDocument()
    const list = screen.getByRole('region', { name: 'Indicatori fără semnal' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(6)
    expect(within(list).getAllByText('Nedetectat')).toHaveLength(6)
    for (const label of Object.values(LABELS)) {
      expect(within(list).getByText(label)).toBeInTheDocument()
    }
    expect(screen.queryByText('Detectat')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Vezi istoricul cumpărătorului' })).not.toBeInTheDocument()
  })

  it('links buyer signals to the buyer page', async () => {
    const { router } = renderRoute(integrityTab(T5))
    await screen.findByRole('region', { name: LABELS.repeat_winner })
    const links = await screen.findAllByRole('link', { name: 'Vezi istoricul cumpărătorului' })
    expect(links).toHaveLength(2)
    const tenderSignal = screen.getByRole('region', { name: LABELS.short_submission_window })
    expect(within(tenderSignal).queryByRole('link', { name: 'Vezi istoricul cumpărătorului' })).toBeNull()

    await userEvent.click(
      within(screen.getByRole('region', { name: LABELS.repeat_winner })).getByRole('link', {
        name: 'Vezi istoricul cumpărătorului',
      }),
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: 'ÎM «Gospodăria Comunală Valea Stelelor»' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/buyers/buyer-valea-stelelor')
  })

  it('never shows evidence without a source, nor a signal with none left', async () => {
    const source = { document_id: 'notice', document_title: 'Anunț de participare', url: '/doc', page: 1 }
    const analysis: TenderAnalysis = {
      tender_id: T1,
      fit_score: null,
      eligibility: null,
      win_chance: null,
      red_flags: RED_FLAG_INDICATORS.map((indicator) => ({
        indicator,
        triggered: indicator === 'short_submission_window' || indicator === 'repeat_winner',
        evidence:
          indicator === 'short_submission_window'
            ? [
                { text: 'Termen de 5 zile.', citations: [source] },
                { text: 'Afirmație fără sursă.', citations: [] },
              ]
            : indicator === 'repeat_winner'
              ? [{ text: 'Altă afirmație fără sursă.', citations: [] }]
              : [],
      })),
    }
    server.use(http.get(api('/tenders/:tenderId/analysis'), () => HttpResponse.json(analysis)))
    renderRoute(integrityTab(T1))

    expect(
      await screen.findByRole('heading', { name: '1 semnal detectat din 6 indicatori verificați' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Termen de 5 zile.')).toBeInTheDocument()
    expect(screen.queryByText('Afirmație fără sursă.')).not.toBeInTheDocument()
    expect(screen.queryByText('Altă afirmație fără sursă.')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: LABELS.repeat_winner })).not.toBeInTheDocument()
    const list = screen.getByRole('region', { name: 'Indicatori fără semnal' })
    expect(within(list).getByText('Fără dovezi de afișat')).toBeInTheDocument()
  })

  it('says when the indicators have not been checked yet', async () => {
    server.use(
      http.get(api('/tenders/:tenderId/analysis'), () =>
        HttpResponse.json({
          tender_id: T1,
          fit_score: null,
          red_flags: [],
          eligibility: null,
          win_chance: null,
        }),
      ),
    )
    renderRoute(integrityTab(T1))
    expect(
      await screen.findByRole('heading', { name: 'Indicatorii nu au fost verificați încă' }),
    ).toBeInTheDocument()
  })
})
