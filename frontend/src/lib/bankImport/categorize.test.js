import { describe, it, expect } from 'vitest'
import { suggestCategory, buildMerchantMap, rankCategories } from './categorize'

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

  it('respeta el tipo — no sugiere una regla de gasto para un ingreso', () => {
    expect(suggestCategory('MAXIPALI LAGUNI', 'ingreso', reglas)).toBeNull()
  })

  it('devuelve null si no hay reglas', () => {
    expect(suggestCategory('MAXIPALI LAGUNI', 'gasto', [])).toBeNull()
  })
})

describe('buildMerchantMap', () => {
  it('mapea comercio normalizado a la categoría más frecuente históricamente', () => {
    const history = [
      { descripcion: 'COMPRAS EN COMERCIOS / 01880055   +001MAXIPALI LAGUNI', categoria: 'Alimentación' },
      { descripcion: 'COMPRAS EN COMERCIOS / 01880056   +001MAXIPALI LAGUNI', categoria: 'Alimentación' },
      { descripcion: 'COMPRAS EN COMERCIOS / 01880057   +001MAXIPALI LAGUNI', categoria: 'Otros' }
    ]
    const map = buildMerchantMap(history)
    expect(map.get('MAXIPALI LAGUNI')).toBe('Alimentación')
  })

  it('ignora filas sin categoría', () => {
    const map = buildMerchantMap([{ descripcion: 'SODA DEPORTES', categoria: null }])
    expect(map.size).toBe(0)
  })

  it('devuelve mapa vacío sin historial', () => {
    expect(buildMerchantMap([]).size).toBe(0)
    expect(buildMerchantMap(undefined).size).toBe(0)
  })
})

describe('rankCategories', () => {
  const frecuencias = [
    { categoria: 'Transporte', cantidad: 10 },
    { categoria: 'Alimentación', cantidad: 5 },
    { categoria: 'Otros', cantidad: 1 }
  ]

  it('pone la coincidencia por comercio primero, resto por frecuencia', () => {
    const merchantMap = new Map([['MAXIPALI LAGUNI', 'Alimentación']])
    expect(rankCategories('MAXIPALI LAGUNI', merchantMap, frecuencias)).toEqual([
      'Alimentación', 'Transporte', 'Otros'
    ])
  })

  it('sin coincidencia por comercio, usa solo frecuencia', () => {
    expect(rankCategories('APPLE.COM/BILL', new Map(), frecuencias)).toEqual([
      'Transporte', 'Alimentación', 'Otros'
    ])
  })

  it('respeta el límite', () => {
    expect(rankCategories('APPLE.COM/BILL', new Map(), frecuencias, 2)).toEqual([
      'Transporte', 'Alimentación'
    ])
  })

  it('no repite la categoría de comercio si también aparece en frecuencias', () => {
    const merchantMap = new Map([['MAXIPALI LAGUNI', 'Transporte']])
    const ranked = rankCategories('MAXIPALI LAGUNI', merchantMap, frecuencias)
    expect(ranked.filter(c => c === 'Transporte')).toHaveLength(1)
  })
})
