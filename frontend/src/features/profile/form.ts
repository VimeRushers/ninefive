export const inputClass =
  'h-9 w-full min-w-0 rounded-lg border bg-card px-2.5 text-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-faint focus:border-primary focus:ring-3 focus:ring-ring/30 aria-invalid:border-critical aria-invalid:focus:ring-critical/20'

/** Element ids, so the completion meter can take the user straight to a field. */
export const FIELD_ID = {
  idno: 'profile-idno',
  name: 'profile-name',
  description: 'profile-description',
  cpv: 'profile-cpv',
  region: 'profile-regions',
  budgetMin: 'profile-budget-min',
  budgetMax: 'profile-budget-max',
  turnover: 'profile-turnover',
  employees: 'profile-employees',
  licenses: 'profile-licenses',
  certifications: 'profile-certifications',
  pricelistButton: 'pricelist-choose',
  pricelistFile: 'pricelist-file',
} as const

/** Moves focus to a field and brings it into view. */
export function focusField(id: string) {
  const element = document.getElementById(id)
  element?.scrollIntoView?.({ block: 'center' })
  element?.focus({ preventScroll: true })
}

/** Opens the file picker of the pricelists panel, with focus on its button for afterwards. */
export function openPricelistPicker() {
  focusField(FIELD_ID.pricelistButton)
  document.getElementById(FIELD_ID.pricelistFile)?.click()
}
