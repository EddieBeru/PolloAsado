import { describe, it, expect } from 'vitest'
import { getFixedExpenseTemplates, computeFixedExpensesStatus } from './fixedExpenses'

const luz = { es_fijo: true, grupo_recurrencia: 'g-luz', concept: 'Luz', category: 'Servicios', amount: 30000, dia_esperado: 10, date: '2026-07-10' }
const luzAgosto = { ...luz, date: '2026-08-08', amount: 32000 }
const alquiler = { es_fijo: true, grupo_recurrencia: 'g-alq', concept: 'Alquiler', category: 'Vivienda', amount: 250000, dia_esperado: 5, date: '2026-07-05' }
const variable = { es_fijo: false, grupo_recurrencia: null, concept: 'Súper', category: 'Alimentación', amount: 15000, date: '2026-08-01' }

describe('getFixedExpenseTemplates', () => {
  it('toma la instancia más reciente de cada grupo', () => {
    const templates = getFixedExpenseTemplates([luz, luzAgosto, alquiler, variable])
    expect(templates).toHaveLength(2)
    const luzTemplate = templates.find(t => t.grupo_recurrencia === 'g-luz')
    expect(luzTemplate.amount).toBe(32000)
  })

  it('ignora gastos que no son fijos', () => {
    expect(getFixedExpenseTemplates([variable])).toEqual([])
  })
})

describe('computeFixedExpensesStatus', () => {
  it('marca pagado si hay una instancia del grupo con fecha dentro del rango', () => {
    const { fijos } = computeFixedExpensesStatus([luz, luzAgosto], { start: '2026-08-01', end: '2026-08-31', hoy: '2026-08-11' })
    expect(fijos.find(f => f.grupo_recurrencia === 'g-luz').pagado).toBe(true)
  })

  it('no cuenta como pagado un pago fuera del rango', () => {
    // luz pagada el 8 de agosto; el ciclo es julio
    const { fijos } = computeFixedExpensesStatus([luzAgosto], { start: '2026-07-01', end: '2026-07-31', hoy: '2026-07-20' })
    expect(fijos.find(f => f.grupo_recurrencia === 'g-luz').pagado).toBe(false)
  })

  it('marca atrasado si hoy pasó la fecha esperada dentro del ciclo y no hay pago', () => {
    const { fijos, hayAtrasados } = computeFixedExpensesStatus([alquiler], { start: '2026-08-01', end: '2026-08-31', hoy: '2026-08-11' })
    const alq = fijos.find(f => f.grupo_recurrencia === 'g-alq')
    expect(alq.pagado).toBe(false)
    expect(alq.atrasado).toBe(true)
    expect(hayAtrasados).toBe(true)
  })

  it('no marca atrasado si todavía no llega la fecha esperada', () => {
    const { fijos, hayAtrasados } = computeFixedExpensesStatus([alquiler], { start: '2026-08-01', end: '2026-08-31', hoy: '2026-08-02' })
    expect(fijos[0].atrasado).toBe(false)
    expect(hayAtrasados).toBe(false)
  })

  it('ciclo a caballo entre dos meses: fija la fecha esperada en la mitad correcta', () => {
    // ciclo 28 jul -> 27 ago. alquiler dia_esperado=5 cae el 5 de agosto (2ª mitad).
    // hoy = 10 de agosto: ya pasó -> atrasado.
    const { fijos } = computeFixedExpensesStatus([alquiler], { start: '2026-07-28', end: '2026-08-27', hoy: '2026-08-10' })
    expect(fijos[0].atrasado).toBe(true)
  })

  it('ciclo a caballo: dia_esperado en la 1ª mitad todavía sin llegar', () => {
    // ciclo 28 jul -> 27 ago. dia_esperado=10 -> única fecha con día 10 en el rango
    // es el 10 de agosto. hoy = 5 de agosto: todavía no llega -> no atrasado.
    const { fijos } = computeFixedExpensesStatus([{ ...luz, date: '2026-06-10' }], { start: '2026-07-28', end: '2026-08-27', hoy: '2026-08-05' })
    expect(fijos[0].atrasado).toBe(false)
  })

  it('sin fijos configurados devuelve lista vacía', () => {
    const { fijos, hayAtrasados } = computeFixedExpensesStatus([variable], { start: '2026-08-01', end: '2026-08-31', hoy: '2026-08-11' })
    expect(fijos).toEqual([])
    expect(hayAtrasados).toBe(false)
  })
})
