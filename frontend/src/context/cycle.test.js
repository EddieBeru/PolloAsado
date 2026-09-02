import { describe, it, expect } from 'vitest'
import { normalizeDiaInicio } from './cycle'

describe('normalizeDiaInicio', () => {
  it('deja pasar un entero válido', () => {
    expect(normalizeDiaInicio(28)).toBe(28)
  })

  it('clampa por arriba a 31', () => {
    expect(normalizeDiaInicio(40)).toBe(31)
  })

  it('clampa por abajo a 1', () => {
    expect(normalizeDiaInicio(0)).toBe(1)
    expect(normalizeDiaInicio(-5)).toBe(1)
  })

  it('trunca decimales', () => {
    expect(normalizeDiaInicio(15.9)).toBe(15)
  })

  it('acepta strings numéricos', () => {
    expect(normalizeDiaInicio('28')).toBe(28)
  })

  it('cae a 1 con basura', () => {
    expect(normalizeDiaInicio(undefined)).toBe(1)
    expect(normalizeDiaInicio(null)).toBe(1)
    expect(normalizeDiaInicio('abc')).toBe(1)
    expect(normalizeDiaInicio(NaN)).toBe(1)
  })
})
