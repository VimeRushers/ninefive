/**
 * API contract between the frontend and the backend.
 *
 * The frontend is built first, against the mocks in src/mocks. The backend
 * will implement exactly these shapes, so this file is the specification.
 * Field names follow backend/app/schemas.py wherever the two overlap
 * (snake_case, same names). Where they differ, the comment says so.
 *
 * Datetimes are ISO 8601 strings. Money is always a MoneyAmount.
 * Errors come back as FastAPI does: { "detail": "..." } with an HTTP status.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export type Language = 'ro' | 'ru' | 'en'

/** ISO 8601 datetime, e.g. "2026-10-03T14:30:00Z". */
export type IsoDateTime = string

/** ISO 8601 date without time, e.g. "2026-10-03". Used by filters. */
export type IsoDate = string

export interface MoneyAmount {
  amount: number
  currency: string
}

/**
 * A page in a document. Self-contained so the UI can render a link without
 * looking the document up. For data-derived evidence (e.g. a past award),
 * `url` points at the MTender record and `page` is null.
 */
export interface Citation {
  document_id: string
  document_title: string
  url: string
  page: number | null
}

/**
 * AI-derived or data-derived text with its sources.
 * Project rule: no citation means it is not shown as fact.
 */
export interface CitedText {
  text: string
  citations: Citation[]
}

export interface ApiErrorBody {
  detail: string
}

// ---------------------------------------------------------------------------
// Company profile
//   POST  /profile
//   GET   /profile/{profile_id}
//   PATCH /profile/{profile_id}
//   GET   /profile/lookup?idno=
// ---------------------------------------------------------------------------

export interface ProfileCreate {
  /** Moldovan tax ID, 13 digits. */
  idno: string | null
  name: string
  /** Free-text description and context the AI uses for matching. */
  description: string
  cpv_codes: string[]
  regions: string[]
  budget_min: number | null
  budget_max: number | null
  // Not in schemas.py yet: eligibility data compared against tender requirements.
  annual_turnover: MoneyAmount | null
  employee_count: number | null
  licenses: string[]
  certifications: string[]
}

export interface ProfileOut extends ProfileCreate {
  id: number
  created_at: IsoDateTime
}

export type ProfileUpdate = Partial<ProfileCreate>

/** Company data found by IDNO, used to pre-fill the profile form. Not in schemas.py. */
export interface CompanyLookup {
  idno: string
  name: string
  legal_form: string | null
  address: string | null
  region: string | null
  registered_at: IsoDate | null
  activities: string[]
  /** Where the data came from, e.g. "data2b.md". */
  source: string
}

// ---------------------------------------------------------------------------
// Catalogue (pricelists). Not in schemas.py.
//   GET    /profile/{profile_id}/pricelists
//   POST   /profile/{profile_id}/pricelists            multipart, field "file"
//   DELETE /profile/{profile_id}/pricelists/{pricelist_id}
//   GET    /profile/{profile_id}/catalogue
//   PATCH  /profile/{profile_id}/catalogue/{item_id}
//   DELETE /profile/{profile_id}/catalogue/{item_id}
// ---------------------------------------------------------------------------

export type PricelistStatus = 'processing' | 'ready' | 'failed'

export interface Pricelist {
  id: number
  file_name: string
  uploaded_at: IsoDateTime
  status: PricelistStatus
  item_count: number
}

/**
 * One product or service read from a pricelist. Only name, description and
 * price are kept. Quantities are never stored, because stock always changes.
 */
export interface CatalogueItem {
  id: number
  pricelist_id: number
  name: string
  description: string
  price: MoneyAmount
}

export type CatalogueItemUpdate = Partial<Pick<CatalogueItem, 'name' | 'description' | 'price'>>

// ---------------------------------------------------------------------------
// Tender board. Not in schemas.py.
//   GET   /board?profile_id=&<BoardFilters>
//   PATCH /board/{tender_id}?profile_id=      body: StageUpdate
// ---------------------------------------------------------------------------

/** Board columns, in display order. */
export const STAGES = ['new', 'questionable', 'not_interested', 'lost', 'won'] as const
export type Stage = (typeof STAGES)[number]

/** Who put the card in its current stage: the system or a person. */
export type StageSource = 'auto' | 'manual'

/**
 * Eligibility percent = met / (total - unknown). Unknown means it could not be
 * checked: not found in the documents, or the profile has no data for it.
 */
export interface EligibilitySummary {
  met_count: number
  total_count: number
  unknown_count: number
}

/** A requirement the company does not meet, e.g. a minimum turnover. */
export interface UnmetParameter {
  kind: 'unmet_parameter'
  parameter: string
  required: string
  /** What the profile says. Null if the profile has no value for it. */
  ours: string | null
  citation: Citation
}

export interface CatalogueMatchCandidate {
  item_id: number
  name: string
  price: MoneyAmount
  /** 0..1 */
  similarity: number
}

/** The AI could not tell whether the company has what the tender asks for. */
export interface GrayZone {
  kind: 'gray_zone'
  /** What the tender asks for, with its source. */
  tender_item: CitedText
  /** What exactly the AI could not decide. */
  explanation: string
  closest_items: CatalogueMatchCandidate[]
}

export type QuestionableReason = UnmetParameter | GrayZone

export interface BoardCard {
  tender_id: string
  title: string
  /** The tender on MTender, for "Open in MTender" on the card. */
  mtender_url: string
  buyer_id: string
  buyer_name: string
  estimated_value: MoneyAmount | null
  region: string | null
  published_at: IsoDateTime
  modified_at: IsoDateTime | null
  /** When the tender period opens. */
  tender_start_at: IsoDateTime | null
  deadline: IsoDateTime | null
  stage: Stage
  stage_source: StageSource
  /** Set when the system moved the card, e.g. "Became irrelevant: lot 1 was cancelled." */
  stage_reason: string | null
  /** Only filled for stage "questionable". */
  questionable_reasons: QuestionableReason[]
  eligibility: EligibilitySummary | null
  /** 0..1, null when there is not enough historical data. */
  win_probability: number | null
  /** Visible AI tags. Search-only tags never reach the frontend. */
  tags: string[]
  red_flag_count: number
  /** True if the most recent sync changed this tender. */
  changed_in_last_sync: boolean
}

export interface BoardResponse {
  profile_id: number
  cards: BoardCard[]
  /** When the backend last pulled MTender (every 30 minutes). */
  last_sync_at: IsoDateTime | null
}

/**
 * Query parameters for GET /board. All optional. Dates are inclusive.
 * `tags` repeats (?tags=a&tags=b) and a card must have every tag given.
 */
export interface BoardFilters {
  /**
   * Search text. The backend matches by meaning, across Romanian and Russian.
   * At minimum it must ignore case and diacritics ("achizitionarea" finds "Achiziționarea").
   */
  q?: string
  published_from?: IsoDate
  published_to?: IsoDate
  modified_from?: IsoDate
  modified_to?: IsoDate
  start_from?: IsoDate
  start_to?: IsoDate
  price_min?: number
  price_max?: number
  region?: string
  tags?: string[]
  /** Only these stages. Repeats like tags: ?stages=new&stages=questionable */
  stages?: Stage[]
  /** Win probability bounds, 0..1, inclusive. Cards without an estimate are left out when a bound is set. */
  win_min?: number
  win_max?: number
  /**
   * Eligibility bounds, 0..1, inclusive, using the same percent as the card:
   * met / (total - unknown). Cards that could not be checked are left out when a bound is set.
   */
  eligibility_min?: number
  eligibility_max?: number
}

export interface StageUpdate {
  stage: Stage
}

// ---------------------------------------------------------------------------
// Tender detail. Not in schemas.py.
//   GET /tenders/{tender_id}?profile_id=
// ---------------------------------------------------------------------------

/** OCDS tender.status values. */
export type MTenderStatus =
  'planning' | 'planned' | 'active' | 'cancelled' | 'unsuccessful' | 'complete' | 'withdrawn'

export type DocumentAnalysisStatus = 'pending' | 'analyzing' | 'analyzed' | 'failed'

export interface TenderDocument {
  document_id: string
  title: string
  url: string
  /** Where the backend got it: "mtender" or another source site. */
  source: string
  /** Null when the buyer published it; otherwise the participant who uploaded it. */
  participant_id: string | null
  language: Language | null
  page_count: number | null
  published_at: IsoDateTime | null
  analysis_status: DocumentAnalysisStatus
  analyzed_at: IsoDateTime | null
}

/** A tender item next to the closest catalogue item. */
export interface ProductMatch {
  tender_item: CitedText
  /** Null when nothing in the catalogue fits. */
  catalogue_item: CatalogueMatchCandidate | null
  /** The tender's own estimate for one unit, if it gives one. */
  estimated_unit_price: MoneyAmount | null
}

export type RelevanceVerdict = 'still_relevant' | 'irrelevant'

/** What one sync changed, and what the AI concluded. */
export interface TenderChange {
  synced_at: IsoDateTime
  /** Human-readable, e.g. "Deadline: 10 Oct → 17 Oct". */
  changes: string[]
  verdict: RelevanceVerdict
  reason: CitedText
  stage_before: Stage
  stage_after: Stage
}

export interface TenderDetail {
  tender_id: string
  ocid: string
  title: string
  description: string
  /** Language the tender itself is written in. */
  language: Language
  buyer_id: string
  buyer_name: string
  estimated_value: MoneyAmount | null
  region: string | null
  cpv_codes: string[]
  procedure_type: string
  mtender_status: MTenderStatus
  mtender_url: string
  published_at: IsoDateTime
  modified_at: IsoDateTime | null
  tender_start_at: IsoDateTime | null
  deadline: IsoDateTime | null
  /** Null when the tender is not on this profile's board. */
  stage: Stage | null
  stage_source: StageSource | null
  stage_reason: string | null
  summary: CitedText[]
  tags: string[]
  documents: TenderDocument[]
  product_matches: ProductMatch[]
  /** Newest first. */
  changes: TenderChange[]
}

// ---------------------------------------------------------------------------
// Analysis. Same endpoint as schemas.py:
//   GET /tenders/{tender_id}/analysis?profile_id=
// ---------------------------------------------------------------------------

export type RequirementType = 'financial' | 'technical' | 'legal' | 'administrative'

export interface EligibilityItem {
  requirement: string
  requirement_type: RequirementType
  threshold: string | null
  /** Differs from schemas.py: replaces `source_page`, so the document is known too. */
  citation: Citation | null
  /** Null = could not be checked: not found in the documents, or no profile data for it. */
  met: boolean | null
  notes: string | null
}

export interface EligibilityChecklist {
  tender_id: string
  profile_id: number | null
  items: EligibilityItem[]
  met_count: number
  total_count: number
  disclaimer: string
}

/** Fixed list of integrity signal codes. The frontend translates them. */
export const RED_FLAG_INDICATORS = [
  'short_submission_window',
  'single_bidder_history',
  'repeat_winner',
  'brand_without_equivalent',
  'narrow_tolerances',
  'cpv_mismatch',
] as const
export type RedFlagIndicator = (typeof RED_FLAG_INDICATORS)[number]

export interface RedFlag {
  /** Differs from schemas.py: a fixed code instead of a free string. */
  indicator: RedFlagIndicator
  triggered: boolean
  /** Differs from schemas.py: structured evidence instead of plain strings. */
  evidence: CitedText[]
}

export interface WinChanceEstimate {
  tender_id: string
  /** 0..1, null when there is not enough historical data. */
  estimated_probability: number | null
  typical_bidder_count: number | null
  /** Typical winning price / estimated value. */
  typical_winning_ratio: number | null
  /** Share of this buyer's contracts that went to a single repeat winner. */
  buyer_concentration: number | null
  disclaimer: string
}

export interface TenderAnalysis {
  tender_id: string
  fit_score: number | null
  red_flags: RedFlag[]
  eligibility: EligibilityChecklist | null
  win_chance: WinChanceEstimate | null
}

// ---------------------------------------------------------------------------
// Competitor analyzer. Not in schemas.py.
//   GET /tenders/{tender_id}/competitors
// Competitors are analyzed whatever the tender's status, and re-analyzed only
// when their files change.
// ---------------------------------------------------------------------------

export type ParticipantStatus = 'winner' | 'rejected' | 'disqualified' | 'under_evaluation'

export interface Participant {
  participant_id: string
  name: string
  idno: string | null
  /** True for the company's own bid. */
  is_us: boolean
  status: ParticipantStatus
  bid_price: MoneyAmount | null
  /** Bid price / estimated value. */
  price_vs_estimate: number | null
  rejection_reason: CitedText | null
  strengths: CitedText[]
  weaknesses: CitedText[]
  document_ids: string[]
}

/**
 * no_documents: nothing published yet (MTender does not publish bids before bid opening).
 * analyzing: files are new or changed. `participants` may hold the previous analysis.
 * up_to_date: files unchanged since `analyzed_at`.
 */
export type CompetitorAnalysisState = 'no_documents' | 'analyzing' | 'up_to_date'

export interface CompetitorAnalysis {
  tender_id: string
  state: CompetitorAnalysisState
  analyzed_at: IsoDateTime | null
  participants: Participant[]
  /** What to do differently on similar tenders. */
  lessons: CitedText[]
}

// ---------------------------------------------------------------------------
// Buyer profile. Same endpoint as schemas.py:
//   GET /buyers/{buyer_id}/profile
// ---------------------------------------------------------------------------

/** Differs from schemas.py: `top_winners` has a fixed shape instead of dict[str, Any]. */
export interface TopWinner {
  name: string
  idno: string | null
  contracts_won: number
  total_value: MoneyAmount
  /** Share of the buyer's contracts, 0..1. */
  share: number
}

export interface BuyerProfile {
  buyer_id: string
  name: string
  total_tenders: number
  single_bidder_rate: number | null
  repeat_winner_concentration: number | null
  top_winners: TopWinner[]
}
