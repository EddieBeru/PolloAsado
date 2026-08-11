import { describe, it, expect } from 'vitest'
import { monthRange } from './period'

describe('monthRange', () => {
  it('devuelve el rango completo de un mes de 31 días', () => {
    expect(monthRange(2026, 1)).toEqual({ start: '2026-01-01', end: '2026-01-31', ym: '2026-01' })
  })

  it('devuelve el rango completo de febrero en año bisiesto', () => {
    expect(monthRange(2028, 2)).toEqual({ start: '2028-02-01', end: '2028-02-29', ym: '2028-02' })
  })

  it('devuelve el rango completo de febrero en año no bisiesto', () => {
    expect(monthRange(2026, 2)).toEqual({ start: '2026-02-01', end: '2026-02-28', ym: '2026-02' })
  })
})
