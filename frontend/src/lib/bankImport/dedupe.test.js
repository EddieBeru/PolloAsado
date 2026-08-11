import { describe, it, expect } from 'vitest'
import { findManualMatches, findDoubleCharges } from './dedupe'

describe('findManualMatches', () => {
  it('detecta un existente con mismo monto y fecha dentro de 1 día', () => {
    const rows = [{ id: 'r1', fecha: '2026-08-06', monto: 1800, tipo: 'gasto', invalid: false }]
    const existentes = [{ id: 'e1', tabla: 'gastos', fecha: '2026-08-07', monto: 1800, tipo: 'gasto' }]
    const matches = findManualMatches(rows, existentes)
    expect(matches.get('r1')).toEqual([{ id: 'e1', tabla: 'gastos', fecha: '2026-08-07', monto: 1800, tipo: 'gasto' }])
  })

  it('no matchea si el tipo difiere', () => {
    const rows = [{ id: 'r1', fecha: '2026-08-06', monto: 1800, tipo: 'gasto', invalid: false }]
    const existentes = [{ id: 'e1', tabla: 'ingresos', fecha: '2026-08-06', monto: 1800, tipo: 'ingreso' }]
    expect(findManualMatches(rows, existentes).size).toBe(0)
  })

  it('no matchea si la fecha está a más de 1 día', () => {
    const rows = [{ id: 'r1', fecha: '2026-08-06', monto: 1800, tipo: 'gasto', invalid: false }]
    const existentes = [{ id: 'e1', tabla: 'gastos', fecha: '2026-08-09', monto: 1800, tipo: 'gasto' }]
    expect(findManualMatches(rows, existentes).size).toBe(0)
  })

  it('ignora filas inválidas', () => {
    const rows = [{ id: 'r1', fecha: '2026-08-06', monto: 1800, tipo: 'gasto', invalid: true }]
    const existentes = [{ id: 'e1', tabla: 'gastos', fecha: '2026-08-06', monto: 1800, tipo: 'gasto' }]
    expect(findManualMatches(rows, existentes).size).toBe(0)
  })
})

describe('findDoubleCharges', () => {
  it('detecta mismo comercio y fecha cercana (autorización + ajuste)', () => {
    const rows = [
      { id: 'r1', fecha: '2026-08-02', tipo: 'gasto', descripcionNormalizada: 'MAXIPALI LAGUNI', invalid: false },
      { id: 'r2', fecha: '2026-08-03', tipo: 'gasto', descripcionNormalizada: 'MAXIPALI LAGUNI', invalid: false }
    ]
    const flags = findDoubleCharges(rows)
    expect(flags.get('r1')).toEqual(['r2'])
    expect(flags.get('r2')).toEqual(['r1'])
  })

  it('no flaguea comercios distintos', () => {
    const rows = [
      { id: 'r1', fecha: '2026-08-02', tipo: 'gasto', descripcionNormalizada: 'MAXIPALI LAGUNI', invalid: false },
      { id: 'r2', fecha: '2026-08-02', tipo: 'gasto', descripcionNormalizada: 'SODA DEPORTES', invalid: false }
    ]
    expect(findDoubleCharges(rows).size).toBe(0)
  })

  it('no flaguea el mismo comercio si la fecha está a más de 2 días', () => {
    const rows = [
      { id: 'r1', fecha: '2026-08-01', tipo: 'gasto', descripcionNormalizada: 'MAXIPALI LAGUNI', invalid: false },
      { id: 'r2', fecha: '2026-08-10', tipo: 'gasto', descripcionNormalizada: 'MAXIPALI LAGUNI', invalid: false }
    ]
    expect(findDoubleCharges(rows).size).toBe(0)
  })
})
