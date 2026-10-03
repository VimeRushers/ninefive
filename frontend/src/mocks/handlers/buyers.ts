import { delay, http, HttpResponse } from 'msw'
import { db } from '../db'
import { api, notFound } from './utils'

export const buyerHandlers = [
  http.get(api('/buyers/:buyerId/profile'), async ({ params }) => {
    await delay()
    const buyer = db.buyers.find((b) => b.buyer_id === params.buyerId)
    return buyer ? HttpResponse.json(buyer) : notFound('Buyer not found')
  }),
]
