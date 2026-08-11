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
  it('marca pagado si hay una instancia del grupo con fecha en el mes', () => {
    const { fijos } = computeFixedExpensesStatus([luz, luzAgosto], { anio: 2026, mes: 8, hoy: '2026-08-11' })
    expect(fijos.find(f => f.grupo_recurrencia === 'g-luz').pagado).toBe(true)
  })

  it('marca pendiente y atrasado si hoy pasó el día esperado sin pago este mes', () => {
    const { fijos, hayAtrasados } = computeFixedExpensesStatus([alquiler], { anio: 2026, mes: 8, hoy: '2026-08-11' })
    const alq = fijos.find(f => f.grupo_recurrencia === 'g-alq')
    expect(alq.pagado).toBe(false)
    expect(alq.atrasado).toBe(true)
    expect(hayAtrasados).toBe(true)
  })

  it('no marca atrasado si todavía no llega el día esperado', () => {
    const { fijos, hayAtrasados } = computeFixedExpensesStatus([alquiler], { anio: 2026, mes: 8, hoy: '2026-08-02' })
    expect(fijos[0].atrasado).toBe(false)
    expect(hayAtrasados).toBe(false)
  })

  it('sin fijos configurados devuelve lista vacía', () => {
    const { fijos, hayAtrasados } = computeFixedExpensesStatus([variable], { anio: 2026, mes: 8, hoy: '2026-08-11' })
    expect(fijos).toEqual([])
    expect(hayAtrasados).toBe(false)
  })
})
