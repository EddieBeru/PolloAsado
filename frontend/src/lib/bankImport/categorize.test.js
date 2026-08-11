import { describe, it, expect } from 'vitest'
import { suggestCategory } from './categorize'

describe('suggestCategory', () => {
  const reglas = [
    { patron: 'SODA DEPORTES', categoria: 'Alimentación', tipo: 'gasto' },
    { patron: 'MAXIPALI', categoria: 'Alimentación', tipo: 'gasto' }
  ]

  it('devuelve la categoría cuando el patrón está contenido en la descripción', () => {
    expect(suggestCategory('MAXIPALI LAGUNI', 'gasto', reglas)).toBe('Alimentación')
  })

  it('devuelve null si no hay match', () => {
    expect(suggestCategory('APPLE.COM/BILL', 'gasto', reglas)).toBeNull()
  })

  it('respeta el tipo — no sugiere una regla de gasto pa un ingreso', () => {
    expect(suggestCategory('MAXIPALI LAGUNI', 'ingreso', reglas)).toBeNull()
  })

  it('devuelve null si no hay reglas', () => {
    expect(suggestCategory('MAXIPALI LAGUNI', 'gasto', [])).toBeNull()
  })
})
