import { parseBankAmount, parseBankDate } from './parseAmount'

export class BankFileParseError extends Error {}

const EXPECTED_HEADERS = [
  'Fecha contable', 'Fecha transacción', 'Hora', 'Documento',
  'Descripción', 'Débitos', 'Créditos'
]

const UNREADABLE_MESSAGE = 'No pudimos leer este archivo — ¿es un export de movimientos de BCR?'

/** Parsea el export "Movimientos del día" de BCR (HTML disfrazado de .xls). */
export function parseBCR(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const table = doc.querySelector('#t1')
  if (!table) throw new BankFileParseError(UNREADABLE_MESSAGE)

  const headerRow = table.querySelector('tr.header1')
  const headerCells = headerRow
    ? Array.from(headerRow.querySelectorAll('th')).map(th => th.textContent.replace(/\s+/g, ' ').trim())
    : []
  const headersMatch = EXPECTED_HEADERS.every((h, i) => headerCells[i]?.startsWith(h))
  if (!headersMatch) throw new BankFileParseError(UNREADABLE_MESSAGE)

  const dataRows = Array.from(table.querySelectorAll('tr'))
    .filter(tr => !tr.classList.contains('header1') && tr.querySelector('td'))

  return dataRows.map(parseRow)
}

function parseRow(tr) {
  const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())
  const [, fechaTransaccionRaw, hora, documento, descripcion, debitosRaw, creditosRaw] = cells

  const fecha = parseBankDate(fechaTransaccionRaw)
  const debito = parseBankAmount(debitosRaw)
  const credito = parseBankAmount(creditosRaw)

  let tipo = null
  let monto = null
  if (Number.isFinite(debito) && debito !== 0) {
    tipo = 'gasto'
    monto = Math.abs(debito)
  } else if (Number.isFinite(credito) && credito !== 0) {
    tipo = 'ingreso'
    monto = Math.abs(credito)
  }

  let invalid = false
  let invalidReason = null
  if (!fecha) {
    invalid = true
    invalidReason = 'Fecha inválida'
  } else if (monto === null) {
    invalid = true
    invalidReason = 'No se pudo leer el monto'
  }

  return { fecha, hora, documento, descripcion, monto, tipo, invalid, invalidReason }
}
