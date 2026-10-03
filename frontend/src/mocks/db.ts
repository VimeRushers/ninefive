import type { BuyerProfile, CatalogueItem, IsoDateTime, Pricelist, ProfileOut } from '@/api/types'
import { buyers } from './data/buyers'
import { LAST_SYNC_AT } from './data/helpers'
import { catalogue, pricelists, profile } from './data/profile'
import { type MockTender, tenders } from './data/tenders'

interface MockDb {
  profile: ProfileOut
  pricelists: Pricelist[]
  catalogue: CatalogueItem[]
  tenders: MockTender[]
  buyers: BuyerProfile[]
  lastSyncAt: IsoDateTime
}

/** In-memory backend state. Changes (moving a card, editing the profile) last until a reload. */
export const db = {} as MockDb

export function resetMockDb(): void {
  Object.assign(
    db,
    structuredClone({ profile, pricelists, catalogue, tenders, buyers, lastSyncAt: LAST_SYNC_AT }),
  )
}

resetMockDb()
