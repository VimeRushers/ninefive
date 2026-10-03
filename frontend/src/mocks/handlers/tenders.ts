import { delay, http, HttpResponse } from 'msw'
import { db } from '../db'
import { api, notFound } from './utils'

const findTender = (tenderId: unknown) => db.tenders.find((t) => t.detail.tender_id === tenderId)

export const tenderHandlers = [
  http.get(api('/tenders/:tenderId'), async ({ params }) => {
    await delay()
    const tender = findTender(params.tenderId)
    return tender ? HttpResponse.json(tender.detail) : notFound('Tender not found')
  }),

  http.get(api('/tenders/:tenderId/analysis'), async ({ params }) => {
    await delay()
    const tender = findTender(params.tenderId)
    return tender ? HttpResponse.json(tender.analysis) : notFound('Tender not found')
  }),

  http.get(api('/tenders/:tenderId/competitors'), async ({ params }) => {
    await delay()
    const tender = findTender(params.tenderId)
    return tender ? HttpResponse.json(tender.competitors) : notFound('Tender not found')
  }),
]
