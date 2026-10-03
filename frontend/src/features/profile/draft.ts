import type { MoneyAmount, ProfileCreate, ProfileOut, ProfileUpdate } from '@/api/types'
import { isValidIdnoFormat } from '@/lib/idno'

/**
 * The profile as the form holds it: numbers stay text while the user types,
 * so an empty field means "not given" rather than zero.
 */
export interface ProfileDraft {
  idno: string
  name: string
  description: string
  cpv_codes: string[]
  regions: string[]
  budget_min: string
  budget_max: string
  annual_turnover: string
  employee_count: string
  licenses: string[]
  certifications: string[]
}

export type DraftField = keyof ProfileDraft

export const CPV_PATTERN = /^\d{8}-\d$/

const numberText = (value: number | null | undefined) => (value == null ? '' : String(value))

export function toDraft(profile: ProfileOut): ProfileDraft {
  return {
    idno: profile.idno ?? '',
    name: profile.name,
    description: profile.description,
    cpv_codes: profile.cpv_codes,
    regions: profile.regions,
    budget_min: numberText(profile.budget_min),
    budget_max: numberText(profile.budget_max),
    annual_turnover: numberText(profile.annual_turnover?.amount),
    employee_count: numberText(profile.employee_count),
    licenses: profile.licenses,
    certifications: profile.certifications,
  }
}

/** Empty text is null; anything else is a number, or NaN when it is not one. */
export function parseNumber(text: string): number | null {
  return text.trim() === '' ? null : Number(text)
}

const mdl = (amount: number | null): MoneyAmount | null =>
  amount === null ? null : { amount, currency: 'MDL' }

/** The draft as the API expects it. Only meaningful once `validate` finds no errors. */
export function toProfile(draft: ProfileDraft): ProfileCreate {
  return {
    idno: draft.idno.trim() || null,
    name: draft.name.trim(),
    description: draft.description.trim(),
    cpv_codes: draft.cpv_codes,
    regions: draft.regions,
    budget_min: parseNumber(draft.budget_min),
    budget_max: parseNumber(draft.budget_max),
    annual_turnover: mdl(parseNumber(draft.annual_turnover)),
    employee_count: parseNumber(draft.employee_count),
    licenses: draft.licenses,
    certifications: draft.certifications,
  }
}

/** Only the fields that differ from the saved profile, so PATCH sends what the user changed. */
export function changesFrom(profile: ProfileOut, draft: ProfileDraft): ProfileUpdate {
  const next = toProfile(draft)
  const update: Record<string, unknown> = {}
  for (const key of Object.keys(next) as (keyof ProfileCreate)[]) {
    if (JSON.stringify(next[key]) !== JSON.stringify(profile[key])) update[key] = next[key]
  }
  return update as ProfileUpdate
}

export type FieldError =
  'idnoFormat' | 'nameRequired' | 'descriptionRequired' | 'notAmount' | 'notWholeNumber' | 'maxBelowMin'

export function validate(draft: ProfileDraft): Partial<Record<DraftField, FieldError>> {
  const errors: Partial<Record<DraftField, FieldError>> = {}
  const idno = draft.idno.trim()
  if (idno && !isValidIdnoFormat(idno)) errors.idno = 'idnoFormat'
  if (!draft.name.trim()) errors.name = 'nameRequired'
  if (!draft.description.trim()) errors.description = 'descriptionRequired'

  const isAmount = (value: number | null) => value === null || (Number.isFinite(value) && value >= 0)
  for (const field of ['budget_min', 'budget_max', 'annual_turnover'] as const) {
    if (!isAmount(parseNumber(draft[field]))) errors[field] = 'notAmount'
  }
  const employees = parseNumber(draft.employee_count)
  if (employees !== null && !(Number.isInteger(employees) && employees >= 0)) {
    errors.employee_count = 'notWholeNumber'
  }

  const min = parseNumber(draft.budget_min)
  const max = parseNumber(draft.budget_max)
  if (!errors.budget_min && !errors.budget_max && min !== null && max !== null && max < min) {
    errors.budget_max = 'maxBelowMin'
  }
  return errors
}

/** What the completion meter checks, in the order the form shows them. */
export const COMPLETION_ITEMS = [
  'idno',
  'name',
  'description',
  'cpv',
  'region',
  'turnover',
  'employees',
  'catalogue',
] as const
export type CompletionItem = (typeof COMPLETION_ITEMS)[number]

const isGiven = (text: string) => {
  const value = parseNumber(text)
  return value !== null && Number.isFinite(value) && value >= 0
}

export function completedItems(draft: ProfileDraft, catalogueCount: number): Record<CompletionItem, boolean> {
  return {
    idno: isValidIdnoFormat(draft.idno.trim()),
    name: draft.name.trim() !== '',
    description: draft.description.trim() !== '',
    cpv: draft.cpv_codes.length > 0,
    region: draft.regions.length > 0,
    turnover: isGiven(draft.annual_turnover),
    employees: isGiven(draft.employee_count),
    catalogue: catalogueCount > 0,
  }
}
