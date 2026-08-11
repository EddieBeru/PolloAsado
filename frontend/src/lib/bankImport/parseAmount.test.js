import { describe, it, expect } from 'vitest'
import { parseBankAmount, parseBankDate } from './parseAmount'

describe('parseBankAmount', () => {
  it('parsea montos negativos con comas de miles', () => {
    expect(parseBankAmount('-19,040.00')).toBe(-19040)
  })
  it('parsea montos positivos', () => {
    expect(parseBankAmount('1,800.00')).toBe(1800)
  })
  it('devuelve NaN para celda vacía', () => {
    expect(Number.isNaN(parseBankAmount(''))).toBe(true)
    expect(Number.isNaN(parseBankAmount(' '))).toBe(true)
  })
})

describe('parseBankDate', () => {
  it('convierte DD/MM/YYYY a YYYY-MM-DD', () => {
    expect(parseBankDate('06/08/2026')).toBe('2026-08-06')
  })
  it('devuelve null para formato inválido', () => {
    expect(parseBankDate('2026-08-06')).toBeNull()
    expect(parseBankDate('')).toBeNull()
    expect(parseBankDate('31/13/2026')).toBe('2026-13-31')
  })
})
