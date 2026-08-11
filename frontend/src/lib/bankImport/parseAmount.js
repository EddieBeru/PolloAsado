/** Convierte '1,800.00' / '-19,040.00' a número. NaN si no hay valor. */
export function parseBankAmount(raw) {
  const cleaned = (raw || '').replace(/ /g, '').trim()
  if (!cleaned) return NaN
  return parseFloat(cleaned.replace(/,/g, ''))
}

/** Convierte 'DD/MM/YYYY' a 'YYYY-MM-DD'. null si el formato no matchea. */
export function parseBankDate(raw) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((raw || '').trim())
  if (!match) return null
  const [, dd, mm, yyyy] = match
  return `${yyyy}-${mm}-${dd}`
}
