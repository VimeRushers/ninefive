/** Moldovan IDNO: 13 digits. Checks the format only, not the control digit. */
export function isValidIdnoFormat(idno: string): boolean {
  return /^\d{13}$/.test(idno)
}
