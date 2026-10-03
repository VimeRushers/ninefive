import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { ProfileUpdate } from '@/api/types'
import { db } from '@/mocks/db'
import { api } from '@/mocks/handlers/utils'
import { server } from '@/mocks/node'
import { renderRoute } from '@/test/render'

const saveButton = () => screen.getByRole('button', { name: 'Salvează profilul' })

/** Renders the profile page and waits for the form. */
async function openProfile() {
  const view = renderRoute('/profile')
  await screen.findByLabelText('Denumire')
  return view
}

describe('profile form', () => {
  it('saves only the changed field, and the new value is there after a reload', async () => {
    const sent: ProfileUpdate[] = []
    server.use(
      http.patch(api('/profile/:profileId'), async ({ request }) => {
        sent.push((await request.clone().json()) as ProfileUpdate)
      }),
    )
    const user = userEvent.setup()
    const { unmount } = await openProfile()
    const name = screen.getByLabelText('Denumire')
    expect(name).toHaveValue('TehnoServ Grup SRL')
    expect(saveButton()).toBeDisabled()

    await user.clear(name)
    await user.type(name, 'TehnoServ Nord SRL')
    expect(screen.getByText('Modificări nesalvate')).toBeInTheDocument()
    await user.click(saveButton())

    expect(await screen.findByText('Salvat')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
    expect(sent).toEqual([{ name: 'TehnoServ Nord SRL' }])

    unmount()
    await openProfile()
    expect(screen.getByLabelText('Denumire')).toHaveValue('TehnoServ Nord SRL')
  })

  it('does not save an IDNO that is not 13 digits', async () => {
    const user = userEvent.setup()
    await openProfile()
    const idno = screen.getByLabelText('IDNO')

    await user.clear(idno)
    await user.type(idno, '12345')
    await user.tab()

    expect(screen.getByText('IDNO-ul are 13 cifre.')).toBeInTheDocument()
    expect(idno).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Corectați câmpurile marcate ca să puteți salva.')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })

  it('asks for a name and a description', async () => {
    const user = userEvent.setup()
    await openProfile()
    await user.clear(screen.getByLabelText('Denumire'))
    await user.clear(screen.getByLabelText('Ce face compania'))
    await user.tab()

    expect(screen.getByText('Introduceți denumirea companiei.')).toBeInTheDocument()
    expect(screen.getByText('Descrieți ce face compania.')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })

  it('discards unsaved changes', async () => {
    const user = userEvent.setup()
    await openProfile()
    const employees = screen.getByLabelText('Angajați')
    await user.clear(employees)
    await user.type(employees, '25')

    await user.click(screen.getByRole('button', { name: 'Renunță la modificări' }))
    expect(employees).toHaveValue(18)
    expect(screen.queryByText('Modificări nesalvate')).not.toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })

  it('says when saving failed and keeps the edit', async () => {
    server.use(
      http.patch(api('/profile/:profileId'), () =>
        HttpResponse.json({ detail: 'Database is down' }, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    await openProfile()
    const employees = screen.getByLabelText('Angajați')
    await user.clear(employees)
    await user.type(employees, '25')
    await user.click(saveButton())

    expect(await screen.findByText('Profilul nu a fost salvat. Încercați din nou.')).toBeInTheDocument()
    expect(employees).toHaveValue(25)
  })

  it('adds and removes CPV codes, rejecting a malformed one', async () => {
    const user = userEvent.setup()
    await openProfile()
    const input = screen.getByRole('textbox', { name: 'Coduri CPV' })
    const list = screen.getByRole('list', { name: 'Coduri CPV' })

    await user.type(input, '3021300{Enter}')
    expect(screen.getByText('Codul CPV are forma 30213000-5.')).toBeInTheDocument()
    expect(input).toHaveValue('3021300')

    await user.clear(input)
    await user.type(input, '33600000-6{Enter}')
    expect(within(list).getByText('33600000-6')).toBeInTheDocument()
    expect(input).toHaveValue('')

    await user.click(within(list).getByRole('button', { name: 'Elimină 30213000-5' }))
    expect(within(list).queryByText('30213000-5')).not.toBeInTheDocument()
    expect(screen.getByText('Modificări nesalvate')).toBeInTheDocument()
  })

  it('asks before leaving with unsaved changes', async () => {
    const user = userEvent.setup()
    const { router } = await openProfile()
    await user.type(screen.getByLabelText('Denumire'), ' Nord')

    const nav = screen.getByRole('navigation', { name: 'Navigare principală' })
    await user.click(within(nav).getByRole('link', { name: 'Licitații' }))
    const dialog = await screen.findByRole('dialog', { name: 'Plecați fără să salvați?' })
    await user.click(within(dialog).getByRole('button', { name: 'Rămâi pe pagină' }))
    expect(router.state.location.pathname).toBe('/profile')
    expect(screen.getByLabelText('Denumire')).toHaveValue('TehnoServ Grup SRL Nord')

    await user.click(within(nav).getByRole('link', { name: 'Licitații' }))
    await user.click(await screen.findByRole('button', { name: 'Pleacă fără să salvezi' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/board'))
  })
})

describe('IDNO lookup', () => {
  it('shows what data2b.md has for the saved IDNO', async () => {
    renderRoute('/profile')
    const found = await screen.findByRole('region', { name: 'Găsit în data2b.md' })
    expect(within(found).getByText('1009600012346')).toBeInTheDocument()
    expect(within(found).getByText('Societate cu răspundere limitată')).toBeInTheDocument()
    expect(within(found).getByText(/^46\.51 Comerț cu ridicata/)).toBeInTheDocument()
    expect(
      within(found).getByText('Denumirea și regiunea din profil coincid cu aceste date.'),
    ).toBeInTheDocument()
  })

  it('fills in the name and region from data2b.md', async () => {
    db.profile.idno = null
    db.profile.name = ''
    db.profile.regions = []
    const user = userEvent.setup()
    await openProfile()

    await user.type(screen.getByLabelText('IDNO'), '1009600012346')
    const found = await screen.findByRole('region', { name: 'Găsit în data2b.md' })
    await user.click(within(found).getByRole('button', { name: 'Completează din data2b.md' }))

    expect(screen.getByLabelText('Denumire')).toHaveValue('TehnoServ Grup SRL')
    expect(
      within(screen.getByRole('list', { name: 'Regiuni' })).getByText('mun. Chișinău'),
    ).toBeInTheDocument()
    expect(within(found).queryByRole('button')).not.toBeInTheDocument()
    // Filled in, not saved: the user still saves.
    expect(screen.getByText('Modificări nesalvate')).toBeInTheDocument()
    expect(db.profile.name).toBe('')
  })

  it('says calmly when the IDNO is not in data2b.md', async () => {
    const user = userEvent.setup()
    await openProfile()
    const idno = screen.getByLabelText('IDNO')
    await user.clear(idno)
    await user.type(idno, '1003600012345')

    expect(
      await screen.findByText('data2b.md nu are o companie cu acest IDNO. Completați datele manual.'),
    ).toBeInTheDocument()
    expect(idno).toHaveAttribute('aria-invalid', 'false')
  })
})

describe('completion meter', () => {
  it('goes up when a missing field is filled in', async () => {
    db.profile.annual_turnover = null
    const user = userEvent.setup()
    await openProfile()
    const meter = screen.getByRole('progressbar', { name: 'Completarea profilului' })
    await waitFor(() => expect(meter).toHaveAttribute('aria-valuenow', '88'))
    expect(screen.getByText('7 din 8 completate')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Adaugă cifra de afaceri anuală' }))
    const turnover = screen.getByLabelText('Cifra de afaceri anuală, MDL')
    expect(turnover).toHaveFocus()
    await user.keyboard('3200000')

    expect(meter).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText(/^Profilul e complet/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Adaugă cifra de afaceri anuală' })).not.toBeInTheDocument()
  })

  it('asks for a pricelist when the catalogue is empty', async () => {
    db.catalogue = []
    renderRoute('/profile')
    expect(await screen.findByRole('heading', { name: 'Catalogul e gol' })).toBeInTheDocument()
    // One in the catalogue, one in the completion meter.
    expect(screen.getAllByRole('button', { name: 'Încarcă o listă de prețuri' })).toHaveLength(2)
    expect(screen.getByRole('progressbar', { name: 'Completarea profilului' })).toHaveAttribute(
      'aria-valuenow',
      '88',
    )
  })
})

describe('pricelists', () => {
  it('shows an uploaded pricelist as processing, then its items once it is read', async () => {
    const user = userEvent.setup()
    await openProfile()
    await user.upload(
      screen.getByLabelText('Încarcă o listă de prețuri'),
      new File(['denumire;pret'], 'Preturi_noi.csv', { type: 'text/csv' }),
    )

    // In jsdom the file name is lost on its way through Node's fetch, so find the new row by position.
    const list = screen.getByRole('list', { name: 'Liste de prețuri' })
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(3))
    const row = within(list).getAllByRole('listitem')[2]
    expect(within(row).getByText('Se citește fișierul…')).toBeInTheDocument()

    // The mock reads a file in 3 seconds and the list checks back every 3 seconds.
    expect(await within(row).findByText('2 articole', {}, { timeout: 7000 })).toBeInTheDocument()
    expect(await screen.findByText(/^Produs 1 din /)).toBeInTheDocument()
  }, 10000)

  it('turns down files that are not Excel, CSV or PDF', async () => {
    const user = userEvent.setup({ applyAccept: false })
    await openProfile()
    await user.upload(
      screen.getByLabelText('Încarcă o listă de prețuri'),
      new File(['x'], 'notite.txt', { type: 'text/plain' }),
    )
    expect(await screen.findByText('notite.txt nu e un fișier Excel, CSV sau PDF.')).toBeInTheDocument()
    expect(db.pricelists).toHaveLength(2)
  })

  it('deletes a pricelist and its items after confirming', async () => {
    const user = userEvent.setup()
    await openProfile()
    await user.click(await screen.findByRole('button', { name: 'Șterge Tarife_servicii_2026.pdf' }))

    const dialog = await screen.findByRole('dialog', { name: 'Ștergeți lista de prețuri?' })
    expect(dialog).toHaveTextContent(
      'Ștergem fișierul Tarife_servicii_2026.pdf și cele 2 articole din catalog citite din el.',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Șterge lista de prețuri' }))

    await waitFor(() => expect(screen.queryByText('Tarife_servicii_2026.pdf')).not.toBeInTheDocument())
    await waitFor(() =>
      expect(screen.queryByText('Instalare și configurare stație de lucru')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('Laptop Lenovo ThinkPad E14 Gen 5')).toBeInTheDocument()
  })

  it('keeps the pricelist when the deletion is cancelled', async () => {
    const user = userEvent.setup()
    await openProfile()
    await user.click(await screen.findByRole('button', { name: 'Șterge Tarife_servicii_2026.pdf' }))
    await user.click(await screen.findByRole('button', { name: 'Anulează' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Tarife_servicii_2026.pdf')).toBeInTheDocument()
    expect(db.pricelists).toHaveLength(2)
  })
})

describe('catalogue', () => {
  it('deletes an item', async () => {
    const user = userEvent.setup()
    await openProfile()
    await user.click(await screen.findByRole('button', { name: 'Șterge Monitor Dell P2423' }))

    await waitFor(() => expect(screen.queryByText('Monitor Dell P2423')).not.toBeInTheDocument())
    expect(screen.getByText('7 articole')).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Liste de prețuri' })
    expect(within(list).getByText('5 articole')).toBeInTheDocument()
  })

  it('edits an item in place', async () => {
    const user = userEvent.setup()
    await openProfile()
    const edit = await screen.findByRole('button', { name: 'Editează Monitor Dell P2423' })
    await user.click(edit)

    const price = screen.getByRole('spinbutton', { name: 'Preț, MDL' })
    await user.clear(price)
    await user.type(price, '4100{Enter}')

    const row = (await screen.findByText(/^4\.100\sMDL$/)).closest('tr')!
    expect(within(row).getByText('Monitor Dell P2423')).toBeInTheDocument()
    expect(db.catalogue.find((item) => item.id === 3)?.price).toEqual({ amount: 4100, currency: 'MDL' })
  })

  it('does not save an item without a name', async () => {
    const user = userEvent.setup()
    await openProfile()
    await user.click(await screen.findByRole('button', { name: 'Editează Monitor Dell P2423' }))
    const row = screen.getByRole('spinbutton', { name: 'Preț, MDL' }).closest('tr')!
    await user.clear(within(row).getByRole('textbox', { name: 'Denumire' }))
    await user.click(within(row).getByRole('button', { name: 'Salvează' }))

    expect(screen.getByText('Introduceți denumirea.')).toBeInTheDocument()
    expect(db.catalogue.find((item) => item.id === 3)?.name).toBe('Monitor Dell P2423')
  })
})
