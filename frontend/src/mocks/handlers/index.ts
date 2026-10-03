import { http, HttpResponse } from 'msw'
import { boardHandlers } from './board'
import { buyerHandlers } from './buyers'
import { profileHandlers } from './profile'
import { tenderHandlers } from './tenders'
import { api } from './utils'

export const handlers = [
  http.get(api('/health'), () => HttpResponse.json({ status: 'ok' })),
  ...profileHandlers,
  ...boardHandlers,
  ...tenderHandlers,
  ...buyerHandlers,
]
