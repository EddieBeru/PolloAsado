import { describe, it, expect } from 'vitest'
import { parseBCR, BankFileParseError } from './parseBCR'

const HEADER = `
<table id="t1" cellspacing="1" cellpadding="2">
  <tr class="header1" valign="top">
    <th>Fecha contable</th>
    <th>Fecha transacción</th>
    <th>Hora</th>
    <th>Documento</th>
    <th>Descripción</th>
    <th>Débitos</th>
    <th>Créditos</th>
  </tr>
`

function withRows(rowsHtml) {
  return `<html><body>${HEADER}${rowsHtml}</table></body></html>`
}

describe('parseBCR', () => {
  it('parsea una fila de débito como gasto', () => {
    const html = withRows(`
      <tr>
        <td>10/08/2026</td><td>06/08/2026</td><td>05:01</td>
        <td>325495</td><td>COMPRAS EN COMERCIOS / 01880055   +002SODA DEPORTES</td>
        <td align="right">-1,800.00</td><td align="right">&nbsp;</td>
      </tr>
    `)
    const rows = parseBCR(html)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      fecha: '2026-08-06',
      hora: '05:01',
      documento: '325495',
      descripcion: 'COMPRAS EN COMERCIOS / 01880055   +002SODA DEPORTES',
      monto: 1800,
      tipo: 'gasto',
      invalid: false
    })
  })

  it('parsea una fila de crédito como ingreso', () => {
    const html = withRows(`
      <tr>
        <td>10/08/2026</td><td>08/08/2026</td><td>10:00</td>
        <td>99001</td><td>SINPE MOVIL OTRA ENT / Transferencia SINPE</td>
        <td align="right">&nbsp;</td><td align="right">5,000.00</td>
      </tr>
    `)
    const rows = parseBCR(html)
    expect(rows[0].tipo).toBe('ingreso')
    expect(rows[0].monto).toBe(5000)
  })

  it('marca inválida una fila sin débito ni crédito', () => {
    const html = withRows(`
      <tr>
        <td>10/08/2026</td><td>08/08/2026</td><td>10:00</td>
        <td>99002</td><td>AJUSTE</td>
        <td align="right">&nbsp;</td><td align="right">&nbsp;</td>
      </tr>
    `)
    const rows = parseBCR(html)
    expect(rows[0].invalid).toBe(true)
    expect(rows[0].invalidReason).toBe('No se pudo leer el monto')
  })

  it('marca inválida una fila con fecha rota', () => {
    const html = withRows(`
      <tr>
        <td>10/08/2026</td><td>rota</td><td>10:00</td>
        <td>99003</td><td>ALGO</td>
        <td align="right">-100.00</td><td align="right">&nbsp;</td>
      </tr>
    `)
    const rows = parseBCR(html)
    expect(rows[0].invalid).toBe(true)
    expect(rows[0].invalidReason).toBe('Fecha inválida')
  })

  it('devuelve arreglo vacío si el archivo no tiene movimientos', () => {
    const html = withRows('')
    expect(parseBCR(html)).toEqual([])
  })

  it('lanza BankFileParseError si la tabla no existe', () => {
    expect(() => parseBCR('<html><body>no hay tabla</body></html>')).toThrow(BankFileParseError)
  })

  it('lanza BankFileParseError si los headers no matchean', () => {
    const html = `<html><body><table id="t1"><tr class="header1"><th>Columna rara</th></tr></table></body></html>`
    expect(() => parseBCR(html)).toThrow(BankFileParseError)
  })
})
