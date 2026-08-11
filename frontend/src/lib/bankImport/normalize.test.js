import { describe, it, expect } from 'vitest'
import { normalizeDescripcion } from './normalize'

describe('normalizeDescripcion', () => {
  it('extrae el comercio de una compra con código de terminal', () => {
    expect(normalizeDescripcion('COMPRAS EN COMERCIOS / 01880055   +002SODA DEPORTES'))
      .toBe('SODA DEPORTES')
  })

  it('no rompe con un comercio que trae "/" en el nombre', () => {
    expect(normalizeDescripcion('COMPRAS EN COMERCIOS / 9840005105 +002APPLE.COM/BILL'))
      .toBe('APPLE.COM/BILL')
  })

  it('extrae el texto tras "/" cuando no hay código +NNN', () => {
    expect(normalizeDescripcion('SINPE MOVIL OTRA ENT / Transferencia SINPE'))
      .toBe('TRANSFERENCIA SINPE')
  })

  it('devuelve el texto completo en mayúsculas si no hay "/"', () => {
    expect(normalizeDescripcion('ajuste manual')).toBe('AJUSTE MANUAL')
  })

  it('devuelve string vacío para entrada vacía', () => {
    expect(normalizeDescripcion('')).toBe('')
  })
})
