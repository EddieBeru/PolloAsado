import { describe, it, expect } from 'vitest'
import { pendingWizardRows, summarizeRows } from './wizardSteps'

describe('pendingWizardRows', () => {
  it('incluye un gasto sin categoría', () => {
    const rows = [{ id: 'r1', incluir: true, tipo: 'gasto', categoria: '', flagTipo: null }]
    expect(pendingWizardRows(rows).map(r => r.id)).toEqual(['r1'])
  })

  it('excluye un gasto ya categorizado sin flag', () => {
    const rows = [{ id: 'r1', incluir: true, tipo: 'gasto', categoria: 'Otros', flagTipo: null }]
    expect(pendingWizardRows(rows)).toEqual([])
  })

  it('excluye un ingreso sin categoría (no es obligatoria)', () => {
    const rows = [{ id: 'r1', incluir: true, tipo: 'ingreso', categoria: '', flagTipo: null }]
    expect(pendingWizardRows(rows)).toEqual([])
  })

  it('incluye una fila con flag sin resolver, aunque ya tenga categoría', () => {
    const rows = [{ id: 'r1', incluir: true, tipo: 'gasto', categoria: 'Otros', flagTipo: 'ya_existe', resolucion: null }]
    expect(pendingWizardRows(rows).map(r => r.id)).toEqual(['r1'])
  })

  it('excluye una fila con flag ya resuelto y categoría puesta', () => {
    const rows = [{ id: 'r1', incluir: true, tipo: 'gasto', categoria: 'Otros', flagTipo: 'cargo_doble', resolucion: 'dos_cargos_reales' }]
    expect(pendingWizardRows(rows)).toEqual([])
  })

  it('excluye un gasto sin categoría cuya resolución es vincular (no se inserta, no la necesita)', () => {
    const rows = [{ id: 'r1', incluir: true, tipo: 'gasto', categoria: '', flagTipo: 'ya_existe', resolucion: 'vincular' }]
    expect(pendingWizardRows(rows)).toEqual([])
  })

  it('excluye filas no incluidas', () => {
    const rows = [{ id: 'r1', incluir: false, tipo: 'gasto', categoria: '', flagTipo: null }]
    expect(pendingWizardRows(rows)).toEqual([])
  })
})

describe('summarizeRows', () => {
  it('cuenta filas ya importadas aparte de los omitidos', () => {
    const rows = [{ flagTipo: 'ya_importado', incluir: false }]
    expect(summarizeRows(rows)).toEqual({ creados: 0, vinculados: 0, omitidos: 0, yaImportados: 1 })
  })

  it('cuenta filas omitidas (no incluidas, sin flag ya_importado)', () => {
    const rows = [{ flagTipo: 'cargo_doble', resolucion: 'mismo_cargo', incluir: false }]
    expect(summarizeRows(rows)).toEqual({ creados: 0, vinculados: 0, omitidos: 1, yaImportados: 0 })
  })

  it('cuenta filas vinculadas', () => {
    const rows = [{ flagTipo: 'ya_existe', resolucion: 'vincular', incluir: true }]
    expect(summarizeRows(rows)).toEqual({ creados: 0, vinculados: 1, omitidos: 0, yaImportados: 0 })
  })

  it('cuenta el resto como creados', () => {
    const rows = [
      { flagTipo: null, incluir: true, tipo: 'gasto', categoria: 'Otros' },
      { flagTipo: 'cargo_doble', resolucion: 'dos_cargos_reales', incluir: true, tipo: 'gasto', categoria: 'Otros' }
    ]
    expect(summarizeRows(rows)).toEqual({ creados: 2, vinculados: 0, omitidos: 0, yaImportados: 0 })
  })
})
