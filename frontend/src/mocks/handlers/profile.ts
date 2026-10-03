import { delay, http, HttpResponse } from 'msw'
import type { CatalogueItem, CatalogueItemUpdate, Pricelist, ProfileCreate, ProfileUpdate } from '@/api/types'
import { companyLookups } from '../data/profile'
import { db } from '../db'
import { api, notFound, profileExists } from './utils'

/** How long a mock pricelist stays "processing" after upload. */
const PROCESSING_MS = 3000

/** Pretends the backend finished reading uploaded pricelists. */
function settlePricelists() {
  for (const pricelist of db.pricelists) {
    if (pricelist.status !== 'processing') continue
    if (Date.now() - Date.parse(pricelist.uploaded_at) < PROCESSING_MS) continue

    const nextId = Math.max(0, ...db.catalogue.map((item) => item.id)) + 1
    const items: CatalogueItem[] = [1, 2].map((n) => ({
      id: nextId + n - 1,
      pricelist_id: pricelist.id,
      name: `Produs ${n} din ${pricelist.file_name}`,
      description: 'Rând citit din lista de prețuri încărcată (date de test).',
      price: { amount: 1000 * n, currency: 'MDL' },
    }))
    db.catalogue.push(...items)
    pricelist.status = 'ready'
    pricelist.item_count = items.length
  }
}

export const profileHandlers = [
  // Before /profile/:profileId, so "lookup" is not read as an id.
  http.get(api('/profile/lookup'), async ({ request }) => {
    await delay()
    const idno = new URL(request.url).searchParams.get('idno') ?? ''
    const company = companyLookups.find((c) => c.idno === idno)
    return company ? HttpResponse.json(company) : notFound(`No company found for IDNO ${idno}`)
  }),

  http.post(api('/profile'), async ({ request }) => {
    await delay()
    const created = (await request.json()) as ProfileCreate
    db.profile = { ...created, id: db.profile.id, created_at: new Date().toISOString() }
    return HttpResponse.json(db.profile, { status: 201 })
  }),

  http.get(api('/profile/:profileId'), async ({ params }) => {
    await delay()
    if (!profileExists(params.profileId)) return notFound('Profile not found')
    return HttpResponse.json(db.profile)
  }),

  http.patch(api('/profile/:profileId'), async ({ params, request }) => {
    await delay()
    if (!profileExists(params.profileId)) return notFound('Profile not found')
    Object.assign(db.profile, (await request.json()) as ProfileUpdate)
    return HttpResponse.json(db.profile)
  }),

  http.get(api('/profile/:profileId/pricelists'), async ({ params }) => {
    await delay()
    if (!profileExists(params.profileId)) return notFound('Profile not found')
    settlePricelists()
    return HttpResponse.json(db.pricelists)
  }),

  http.post(api('/profile/:profileId/pricelists'), async ({ params, request }) => {
    await delay()
    if (!profileExists(params.profileId)) return notFound('Profile not found')
    const file = (await request.formData()).get('file')
    const pricelist: Pricelist = {
      id: Math.max(0, ...db.pricelists.map((p) => p.id)) + 1,
      file_name: file instanceof File ? file.name : 'lista.xlsx',
      uploaded_at: new Date().toISOString(),
      status: 'processing',
      item_count: 0,
    }
    db.pricelists.push(pricelist)
    return HttpResponse.json(pricelist, { status: 201 })
  }),

  http.delete(api('/profile/:profileId/pricelists/:pricelistId'), async ({ params }) => {
    await delay()
    if (!profileExists(params.profileId)) return notFound('Profile not found')
    const id = Number(params.pricelistId)
    if (!db.pricelists.some((p) => p.id === id)) return notFound('Pricelist not found')
    db.pricelists = db.pricelists.filter((p) => p.id !== id)
    db.catalogue = db.catalogue.filter((item) => item.pricelist_id !== id)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(api('/profile/:profileId/catalogue'), async ({ params }) => {
    await delay()
    if (!profileExists(params.profileId)) return notFound('Profile not found')
    settlePricelists()
    return HttpResponse.json(db.catalogue)
  }),

  http.patch(api('/profile/:profileId/catalogue/:itemId'), async ({ params, request }) => {
    await delay()
    if (!profileExists(params.profileId)) return notFound('Profile not found')
    const item = db.catalogue.find((i) => i.id === Number(params.itemId))
    if (!item) return notFound('Catalogue item not found')
    Object.assign(item, (await request.json()) as CatalogueItemUpdate)
    return HttpResponse.json(item)
  }),

  http.delete(api('/profile/:profileId/catalogue/:itemId'), async ({ params }) => {
    await delay()
    if (!profileExists(params.profileId)) return notFound('Profile not found')
    const item = db.catalogue.find((i) => i.id === Number(params.itemId))
    if (!item) return notFound('Catalogue item not found')
    db.catalogue = db.catalogue.filter((i) => i !== item)
    const pricelist = db.pricelists.find((p) => p.id === item.pricelist_id)
    if (pricelist) pricelist.item_count -= 1
    return new HttpResponse(null, { status: 204 })
  }),
]
