import { describe, it, expect } from 'vitest'
import { computeBudgetSplit } from './budgetSplit'

const categoriaBaldes = { Vivienda: 'necesidad', Entretenimiento: 'gusto' }
const porcentajesBalde = { necesidad: 50, gusto: 30, ahorro: 20 }

describe('computeBudgetSplit', () => {
  it('reparte gastado por balde según el mapeo de categorías', () => {
    const totalsByCategory = [
      { categoria: 'Vivienda', total: 100000 },
      { categoria: 'Entretenimiento', total: 20000 }
    ]
    const result = computeBudgetSplit({ totalsByCategory, categoriaBaldes, porcentajesBalde, ingresoMensual: 500000 })
    expect(result.necesidad.gastado).toBe(100000)
    expect(result.gusto.gastado).toBe(20000)
    expect(result.ahorro.gastado).toBe(0)
  })

  it('calcula el techo como ingreso × porcentaje del balde', () => {
    const result = computeBudgetSplit({ totalsByCategory: [], categoriaBaldes, porcentajesBalde, ingresoMensual: 500000 })
    expect(result.necesidad.techo).toBe(250000)
    expect(result.gusto.techo).toBe(150000)
    expect(result.ahorro.techo).toBe(100000)
  })

  it('categoría sin mapeo cae en gusto', () => {
    const totalsByCategory = [{ categoria: 'SinMapear', total: 5000 }]
    const result = computeBudgetSplit({ totalsByCategory, categoriaBaldes, porcentajesBalde, ingresoMensual: 100000 })
    expect(result.gusto.gastado).toBe(5000)
  })

  it('sin ingreso, techo en 0 pero no rompe', () => {
    const result = computeBudgetSplit({ totalsByCategory: [], categoriaBaldes, porcentajesBalde, ingresoMensual: 0 })
    expect(result.necesidad.techo).toBe(0)
    expect(result.gusto.techo).toBe(0)
    expect(result.ahorro.techo).toBe(0)
  })
})
