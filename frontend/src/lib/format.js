// Formato de números, dinero y fechas.
//
// Un solo lugar para el formato: los montos son el material visual principal del
// producto, así que tienen que leerse igual en toda la app y no romperse cuando
// llega un valor sucio (null, '', 'abc', Infinity, un string de PostgREST).

const LOCALE = 'es-CR'

/** Coerción segura a número finito. Devuelve `fallback` si el valor no sirve. */
export function toNumber(value, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (value === null || value === undefined || value === '') return fallback
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : fallback
}

// Intl.NumberFormat lanza RangeError con un código de divisa inválido (el usuario
// puede escribir cualquier cosa de 3 letras en Ajustes). Cacheamos los formatters
// válidos y caemos a un formato decimal + código cuando el código no existe.
const currencyFormatters = new Map()

function currencyFormatter(currency) {
  if (currencyFormatters.has(currency)) return currencyFormatters.get(currency)
  let formatter
  try {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  } catch {
    formatter = null
  }
  currencyFormatters.set(currency, formatter)
  return formatter
}

const decimalFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

/**
 * Monto con separadores de miles y código de divisa.
 *
 * @param {*} value          monto (número o string)
 * @param {string} currency  código ISO, ej. 'CRC'
 * @param {object} [opts]
 * @param {boolean} [opts.signed]  fuerza '+' en positivos (listas de ingresos)
 * @param {boolean} [opts.absolute] formatea el valor absoluto (listas de gastos,
 *                                  donde el signo lo pone la etiqueta)
 * @returns {string} ej. '+CRC 1 234 567,00'
 */
export function formatMoney(value, currency = 'CRC', { signed = false, absolute = false } = {}) {
  let n = toNumber(value)
  if (absolute) n = Math.abs(n)

  const code = typeof currency === 'string' && currency ? currency.toUpperCase() : 'CRC'
  const formatter = currencyFormatter(code)
  const raw = formatter ? formatter.format(n) : `${decimalFormatter.format(n)} ${code}`

  // Intl emite el guion corto; la UI escribe el signo menos (U+2212) cuando lo
  // pone ella. Se unifica acá para que un mismo monto no cambie de glifo según
  // quién lo imprimió.
  const body = raw.replace('-', '−')

  return signed && n > 0 ? `+${body}` : body
}

/** Número plano con separadores (sin divisa). */
export function formatNumber(value, { decimals = 2 } = {}) {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(toNumber(value))
}

/** Porcentaje con un decimal. Devuelve null si la base es 0 (evita Infinity). */
export function formatPercent(part, whole) {
  const w = toNumber(whole)
  if (w === 0) return null
  return `${formatNumber((toNumber(part) / w) * 100, { decimals: 1 })}%`
}

/**
 * Fecha 'YYYY-MM-DD' -> '8 ago 2026'. Se construye con componentes locales para
 * que no se corra un día por el offset de zona horaria.
 */
export function formatDate(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso ?? ''
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** 'YYYY-MM' -> 'agosto 2026'. Devuelve el valor crudo si no parsea. */
export function formatMonth(ym) {
  if (typeof ym !== 'string' || !/^\d{4}-\d{2}$/.test(ym)) return ym ?? ''
  const [y, m] = ym.split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  if (Number.isNaN(date.getTime())) return ym
  return date.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })
}
