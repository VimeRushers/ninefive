import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import { api } from '@/mocks/handlers/utils'
import { server } from '@/mocks/node'
import { renderRoute } from '@/test/render'

const T5 = 'ocds-b3wdp1-MD-1759301000005'

describe('routes', () => {
  it('redirects / to the board and shows all five stages', async () => {
    const { router } = renderRoute('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Licitații' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/board')
    await screen.findByRole('region', { name: 'Nou' })
    for (const stage of ['Nou', 'Discutabil', 'Fără interes', 'Pierdut', 'Câștigat']) {
      expect(screen.getByRole('region', { name: stage })).toBeInTheDocument()
    }
    expect(await screen.findByText(/Date MTender actualizate/)).toBeInTheDocument()
  })

  it('opens a tender with its tabs', async () => {
    renderRoute(`/tenders/${T5}`)
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Achiziționarea calculatoarelor și monitoarelor pentru aparatul administrativ',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Concurenți' })).toBeInTheDocument()
    expect(await screen.findByText('Ofertele se depun în 6 zile de la publicare.')).toBeInTheDocument()
  })

  it('renders the competitors and integrity tabs, the profile and a buyer', async () => {
    renderRoute(`/tenders/${T5}/integrity`)
    expect(await screen.findByText(/nu dovezi ale unor încălcări/)).toBeInTheDocument()

    renderRoute(`/tenders/${T5}/competitors`)
    expect(
      await screen.findByRole('heading', { name: 'Documentele participanților nu sunt publicate încă' }),
    ).toBeInTheDocument()

    renderRoute('/profile')
    expect(await screen.findByRole('heading', { level: 1, name: 'Profilul companiei' })).toBeInTheDocument()
    expect(await screen.findByText('1009600012346')).toBeInTheDocument()

    renderRoute('/buyers/buyer-valea-stelelor')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'ÎM «Gospodăria Comunală Valea Stelelor»' }),
    ).toBeInTheDocument()
  })

  it('shows "not found" for unknown tenders and paths', async () => {
    renderRoute('/tenders/missing')
    expect(await screen.findByRole('heading', { name: 'Pagina nu există' })).toBeInTheDocument()
  })

  it('shows "not found" for unknown paths', async () => {
    renderRoute('/no-such-page')
    expect(await screen.findByRole('heading', { name: 'Pagina nu există' })).toBeInTheDocument()
  })

  it('shows an error with a retry button when the server fails', async () => {
    server.use(
      http.get(api('/board'), () => HttpResponse.json({ detail: 'Database is down' }, { status: 500 })),
    )
    renderRoute('/board')
    expect(await screen.findByRole('alert')).toHaveTextContent('Datele nu s-au încărcat')
    expect(screen.getByText('500: Database is down')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Încearcă din nou' })).toBeInTheDocument()
  })

  it('marks the active tender tab', async () => {
    renderRoute(`/tenders/${T5}/competitors`)
    const tab = await screen.findByRole('link', { name: 'Concurenți' })
    expect(tab).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Detalii' })).not.toHaveAttribute('aria-current')
  })

  it('keeps the board item active in the sidebar on tender pages', async () => {
    renderRoute(`/tenders/${T5}`)
    const nav = await screen.findByRole('navigation', { name: 'Navigare principală' })
    expect(within(nav).getByRole('link', { name: 'Licitații' })).toHaveAttribute('aria-current', 'page')
  })

  it('switches between light and dark theme', async () => {
    document.documentElement.dataset.theme = 'light'
    renderRoute('/board')
    await userEvent.click(await screen.findByRole('button', { name: 'Comută la tema întunecată' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('ninefive.theme')).toBe('dark')
    await userEvent.click(screen.getByRole('button', { name: 'Comută la tema luminoasă' }))
    expect(document.documentElement.dataset.theme).toBe('light')
    localStorage.removeItem('ninefive.theme')
  })

  it('collapses the sidebar and remembers it', async () => {
    renderRoute('/board')
    await userEvent.click(await screen.findByRole('button', { name: 'Restrânge meniul' }))
    expect(screen.getByRole('button', { name: 'Extinde meniul' })).toBeInTheDocument()
    expect(localStorage.getItem('ninefive.sidebar-collapsed')).toBe('true')
    localStorage.removeItem('ninefive.sidebar-collapsed')
  })

  it('switches the interface language', async () => {
    renderRoute('/board')
    await screen.findByRole('heading', { level: 1, name: 'Licitații' })
    await userEvent.click(screen.getByRole('button', { name: 'RU' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Тендеры' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('ru')
    await i18n.changeLanguage('ro')
  })
})
