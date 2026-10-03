import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { api } from '@/mocks/handlers/utils'
import { server } from '@/mocks/node'
import { renderRoute } from '@/test/render'

const LAPTOPS = 'Achiziționarea laptopurilor pentru laboratorul de informatică'
const NETWORK = 'Achiziționarea echipamentelor de rețea pentru centrele comunitare de acces la internet'
const PRINTERS = 'Achiziționarea imprimantelor multifuncționale color A3'
const LIBRARY = 'Achiziționarea calculatoarelor și licențelor software pentru bibliotecă'

afterEach(() => localStorage.removeItem('ninefive.board-view'))

describe('board search', () => {
  it('filters as you type, ignoring diacritics, and keeps the search in the URL', async () => {
    const { router } = renderRoute('/board')
    await screen.findByText(NETWORK)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Caută licitații' }), 'achizitionarea laptop')
    await waitFor(() => expect(screen.queryByText(NETWORK)).not.toBeInTheDocument())
    expect(screen.getByText(LAPTOPS)).toBeInTheDocument()
    expect(screen.getByText('1 rezultat')).toBeInTheDocument()
    expect(router.state.location.search).toContain('q=achizitionarea+laptop')
  })

  it('opens with the search from the URL', async () => {
    renderRoute('/board?q=laptop')
    expect(await screen.findByText(LAPTOPS)).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveValue('laptop')
    expect(screen.queryByText(NETWORK)).not.toBeInTheDocument()
  })

  it('says when nothing matches and clears the search', async () => {
    renderRoute('/board?q=zzzz')
    expect(await screen.findByRole('heading', { name: 'Nicio licitație pentru „zzzz”' })).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Șterge căutarea' })[0])
    expect(await screen.findByText(NETWORK)).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })

  it('focuses the search with "/"', async () => {
    renderRoute('/board')
    await screen.findByText(NETWORK)
    await userEvent.keyboard('/')
    expect(screen.getByRole('searchbox')).toHaveFocus()
  })
})

describe('list view', () => {
  it('shows every tender as a table row and remembers the choice', async () => {
    const { router } = renderRoute('/board')
    await screen.findByText(NETWORK)
    await userEvent.click(screen.getByRole('button', { name: 'Listă' }))

    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(11)
    expect(router.state.location.search).toContain('view=list')
    expect(localStorage.getItem('ninefive.board-view')).toBe('list')
  })

  it('sorts by value, biggest first, then the other way', async () => {
    renderRoute('/board?view=list')
    const table = await screen.findByRole('table')
    const firstTitle = () => within(within(table).getAllByRole('row')[1]).getAllByRole('link')[0]

    await userEvent.click(within(table).getByRole('button', { name: 'Valoare' }))
    expect(firstTitle()).toHaveTextContent(NETWORK)
    expect(within(table).getByRole('columnheader', { name: 'Valoare' })).toHaveAttribute(
      'aria-sort',
      'descending',
    )

    await userEvent.click(within(table).getByRole('button', { name: 'Valoare' }))
    expect(firstTitle()).toHaveTextContent(
      'Achiziționarea calculatoarelor și licențelor software pentru bibliotecă',
    )
  })

  it('opens a tender when its row is clicked', async () => {
    const { router } = renderRoute('/board?view=list')
    const table = await screen.findByRole('table')
    // Click the buyer line, not the title link, to test the row itself.
    await userEvent.click(within(table).getAllByText('IMSP Centrul de Diagnostic «Aurora Medica»')[0])
    expect(router.state.location.pathname).toMatch(/^\/tenders\/ocds-b3wdp1-MD-/)
  })
})

describe('board filters', () => {
  const cardCount = () => screen.getAllByRole('article').length

  it('filters by location from the list of regions', async () => {
    const { router } = renderRoute('/board')
    await screen.findByText(NETWORK)
    await userEvent.click(screen.getByRole('button', { name: 'Locație' }))
    await userEvent.click(await screen.findByRole('button', { name: 'UTA Găgăuzia' }))

    await waitFor(() => expect(screen.queryByText(NETWORK)).not.toBeInTheDocument())
    expect(cardCount()).toBe(2)
    expect(router.state.location.search).toContain('region=UTA+G%C4%83g%C4%83uzia')
    expect(screen.getByRole('button', { name: 'Locație:UTA Găgăuzia' })).toBeInTheDocument()
  })

  it('filters by maximum price', async () => {
    renderRoute('/board')
    await screen.findByText(NETWORK)
    await userEvent.click(screen.getByRole('button', { name: 'Preț' }))
    await userEvent.type(await screen.findByLabelText('Maxim, MDL'), '100000')
    await userEvent.click(screen.getByRole('button', { name: 'Aplică' }))

    await waitFor(() => expect(cardCount()).toBe(2))
    expect(screen.getByText('Servicii de mentenanță a sistemului de supraveghere video')).toBeInTheDocument()
  })

  it('filters by publication date', async () => {
    renderRoute('/board')
    await screen.findByText(NETWORK)
    await userEvent.click(screen.getByRole('button', { name: 'Data publicării' }))
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    fireEvent.change(await screen.findByLabelText('De la'), { target: { value: fourDaysAgo } })

    // T1, T2, T4 and T5 were published in the last four days.
    await waitFor(() => expect(cardCount()).toBe(4))
  })

  it('combines tags with search, and resets the filters but keeps the search', async () => {
    renderRoute('/board?q=achizitionarea')
    await screen.findByText(LAPTOPS)
    await userEvent.click(screen.getByRole('button', { name: 'Etichete' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Educație' }))
    await waitFor(() => expect(cardCount()).toBe(3))

    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Resetează filtrele' }))
    await waitFor(() => expect(cardCount()).toBeGreaterThan(3))
    expect(screen.getByRole('searchbox')).toHaveValue('achizitionarea')
  })

  it('shows only the chosen stages, as KPI cards and columns', async () => {
    const { router } = renderRoute('/board')
    await screen.findByText(NETWORK)
    await userEvent.click(screen.getByRole('button', { name: 'Etapă' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Câștigat' }))
    await userEvent.click(screen.getByRole('button', { name: 'Pierdut' }))

    await waitFor(() => expect(cardCount()).toBe(2))
    expect(screen.queryByRole('region', { name: 'Nou' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Pierdut' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Câștigat' })).toBeInTheDocument()
    // Kept in board order, not click order.
    expect(router.state.location.search).toContain('stages=lost&stages=won')
    expect(screen.getByRole('button', { name: 'Etapă:Pierdut +1' })).toBeInTheDocument()
  })

  it('filters by minimum win chance with a preset', async () => {
    renderRoute('/board')
    await screen.findByText(NETWORK)
    await userEvent.click(screen.getByRole('button', { name: 'Șanse de câștig' }))
    await userEvent.click(await screen.findByRole('button', { name: /≥ 50/ }))

    await waitFor(() => expect(cardCount()).toBe(1))
    expect(
      screen.getByText('Поставка компьютерной техники и принтеров для центра социальных услуг'),
    ).toBeInTheDocument()
  })

  it('filters by eligibility range typed in percent', async () => {
    const { router } = renderRoute('/board?view=list')
    await screen.findByRole('table')
    // The list also has an "Eligibilitate" column header; use the one in the filter bar.
    await userEvent.click(
      within(screen.getByRole('group', { name: 'Filtre' })).getByRole('button', { name: 'Eligibilitate' }),
    )
    await userEvent.type(await screen.findByLabelText('Maxim, %'), '60')
    await userEvent.click(screen.getByRole('button', { name: 'Aplică' }))

    await waitFor(() => expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2))
    expect(router.state.location.search).toContain('eligibility_max=0.6')
  })

  it('says when filters match nothing', async () => {
    renderRoute('/board?price_min=99000000')
    expect(
      await screen.findByRole('heading', { name: 'Nicio licitație pentru filtrele alese' }),
    ).toBeInTheDocument()
  })
})

const column = (stage: string) => screen.getByRole('region', { name: stage })
const cardIn = (stage: string, title: string) => within(column(stage)).queryByRole('article', { name: title })

/** Opens a card's "⋯" menu and picks an item. */
async function pickFromMenu(card: HTMLElement, item: string) {
  await userEvent.click(within(card).getByRole('button', { name: /^Acțiuni pentru/ }))
  await userEvent.click(await screen.findByRole('menuitem', { name: item }))
}

describe('moving cards', () => {
  it('moves a card with its menu, keeps focus on it, and the move survives a reload', async () => {
    const { unmount } = renderRoute('/board')
    await pickFromMenu(await screen.findByRole('article', { name: LAPTOPS }), 'Câștigat')

    await waitFor(() => expect(cardIn('Câștigat', LAPTOPS)).toBeInTheDocument())
    expect(cardIn('Nou', LAPTOPS)).not.toBeInTheDocument()
    await waitFor(() => expect(within(column('Câștigat')).getByRole('link', { name: LAPTOPS })).toHaveFocus())

    // A fresh load reads the board from the server again.
    unmount()
    renderRoute('/board')
    await screen.findByRole('article', { name: LAPTOPS })
    expect(cardIn('Câștigat', LAPTOPS)).toBeInTheDocument()
  })

  it('shows the move before the server answers, and undoes it if the server refuses', async () => {
    let answer!: () => void
    const answered = new Promise<void>((resolve) => (answer = resolve))
    server.use(
      http.patch(api('/board/:tenderId'), async () => {
        await answered
        return HttpResponse.json({ detail: 'Database is down' }, { status: 500 })
      }),
    )
    renderRoute('/board')
    await pickFromMenu(await screen.findByRole('article', { name: LAPTOPS }), 'Pierdut')

    await waitFor(() => expect(cardIn('Pierdut', LAPTOPS)).toBeInTheDocument())
    expect(cardIn('Nou', LAPTOPS)).not.toBeInTheDocument()

    answer()
    expect(await screen.findByRole('alert')).toHaveTextContent('Nu am putut muta licitația.')
    expect(cardIn('Nou', LAPTOPS)).toBeInTheDocument()
    expect(cardIn('Pierdut', LAPTOPS)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Închide mesajul' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('offers the tender, MTender in a new tab and the other four stages in the menu', async () => {
    renderRoute('/board')
    await userEvent.click(
      within(await screen.findByRole('article', { name: LAPTOPS })).getByRole('button', {
        name: `Acțiuni pentru „${LAPTOPS}”`,
      }),
    )
    const mtender = await screen.findByRole('menuitem', { name: 'Deschide în MTender' })
    expect(mtender).toHaveAttribute('href', 'https://mtender.gov.md/tenders/ocds-b3wdp1-MD-1759301000001')
    expect(mtender).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('menuitem', { name: 'Deschide licitația' })).toHaveAttribute(
      'href',
      '/tenders/ocds-b3wdp1-MD-1759301000001',
    )
    // The card is already in "Nou", so that stage is not offered.
    expect(screen.queryByRole('menuitem', { name: 'Nou' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('menuitem')).toHaveLength(6)
  })

  it('moves a tender from the list view menu without opening it', async () => {
    const { router } = renderRoute('/board?view=list')
    const table = await screen.findByRole('table')
    const row = () => within(table).getByRole('link', { name: LAPTOPS }).closest('tr') as HTMLElement

    await pickFromMenu(row(), 'Fără interes')
    await waitFor(() => expect(within(row()).getByText('Fără interes')).toBeInTheDocument())
    expect(router.state.location.pathname).toBe('/board')
  })

  it('picks up a card from its handle with the keyboard and tells screen readers', async () => {
    renderRoute('/board')
    const card = await screen.findByRole('article', { name: LAPTOPS })
    const handle = within(card).getByRole('button', { name: `Mută „${LAPTOPS}”` })
    expect(handle).toHaveAttribute('aria-roledescription', 'card mutabil')

    handle.focus()
    await userEvent.keyboard(' ')
    expect(await screen.findByText(`Ați ridicat „${LAPTOPS}” din coloana „Nou”.`)).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(
      await screen.findByText(`Ați anulat mutarea. Licitația „${LAPTOPS}” rămâne în „Nou”.`),
    ).toBeInTheDocument()
    expect(cardIn('Nou', LAPTOPS)).toBeInTheDocument()
  })
})

describe('questionable reasons', () => {
  it('shows the first unmet parameter with its source, and the rest on request', async () => {
    renderRoute('/board')
    const card = await screen.findByRole('article', { name: NETWORK })
    expect(within(card).getByText('Cifra de afaceri anuală')).toBeInTheDocument()
    expect(within(card).getByText('cel puțin 5 000 000 MDL')).toBeInTheDocument()
    expect(within(card).getByText('3 200 000 MDL')).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: /DUAE\).*p\. 4/ })).toHaveAttribute('target', '_blank')
    expect(within(card).queryByText('Contracte similare în ultimii 3 ani')).not.toBeInTheDocument()

    const more = within(card).getByRole('button', { name: 'Încă 1 motiv' })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(more)

    expect(within(card).getByText('Contracte similare în ultimii 3 ani')).toBeInTheDocument()
    expect(within(card).getByText('Nu e în profil')).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: /DUAE\).*p\. 5/ })).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Arată mai puțin' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('shows a gray zone with its source; "Avem" moves the tender to Nou', async () => {
    renderRoute('/board')
    const card = await screen.findByRole('article', { name: PRINTERS })
    expect(within(card).getByText('Nu e clar dacă aveți ce se cere')).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: /Caiet de sarcini.*p\. 3/ })).toHaveAttribute(
      'target',
      '_blank',
    )
    expect(
      within(card).getByText('Imprimantă multifuncțională HP LaserJet Pro MFP M428fdw'),
    ).toBeInTheDocument()
    expect(within(card).getByText(/Potrivire 71/)).toBeInTheDocument()

    await userEvent.click(within(card).getByRole('button', { name: 'Avem' }))
    await waitFor(() => expect(cardIn('Nou', PRINTERS)).toBeInTheDocument())
    // Out of "Discutabil", the question is gone.
    expect(cardIn('Nou', PRINTERS)).not.toHaveTextContent('Nu e clar')
  })

  it('"Nu avem" moves the gray zone tender to Fără interes', async () => {
    renderRoute('/board')
    const card = await screen.findByRole('article', { name: PRINTERS })
    await userEvent.click(within(card).getByRole('button', { name: 'Nu avem' }))
    await waitFor(() => expect(cardIn('Fără interes', PRINTERS)).toBeInTheDocument())
    expect(cardIn('Discutabil', PRINTERS)).not.toBeInTheDocument()
  })

  it('says when a card was moved automatically, until someone moves it', async () => {
    renderRoute('/board')
    const card = await screen.findByRole('article', { name: LIBRARY })
    expect(within(card).getByText('Mutat automat')).toBeInTheDocument()
    expect(within(card).getByText(/A devenit irelevantă/)).toBeInTheDocument()

    await pickFromMenu(card, 'Nou')
    await waitFor(() => expect(cardIn('Nou', LIBRARY)).toBeInTheDocument())
    expect(within(column('Nou')).getByRole('article', { name: LIBRARY })).not.toHaveTextContent(
      'Mutat automat',
    )
  })
})
