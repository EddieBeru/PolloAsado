import { describe, it, expect } from 'vitest'
import { getBankParser, BANK_PARSERS } from './banks'

describe('getBankParser', () => {
  it('devuelve el parser de bcr', () => {
    const parser = getBankParser('bcr')
    expect(parser.id).toBe('bcr')
    expect(parser.label).toBe('BCR')
    expect(typeof parser.parse).toBe('function')
  })

  it('lanza error para un banco no soportado', () => {
    expect(() => getBankParser('bac')).toThrow('Banco no soportado: bac')
  })

  it('BANK_PARSERS lista al menos bcr', () => {
    expect(Object.keys(BANK_PARSERS)).toContain('bcr')
  })
})
