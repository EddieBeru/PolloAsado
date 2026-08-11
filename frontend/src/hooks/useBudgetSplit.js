import { useMemo } from 'react'
import { useStats } from './useStats'
import { fetchRangeTotals, fetchTotalsByCategory } from '../lib/stats'
import { computePendingSplit } from '../lib/balance'
import { monthRange } from '../lib/period'
import { computeBudgetSplit } from '../lib/budgetSplit'
import { toNumber } from '../lib/format'

/**
 * Balde 50/30/20 del mes indicado (default: mes actual).
 * @param {{categoria_baldes, porcentajes_balde}} preferencias
 * @param {Array} incomes  ingresos locales, pa' el delta pendiente del mes
 * @param {Array} outcomes gastos locales, pa' el delta pendiente del mes
 * @param {number} [anio]
 * @param {number} [mes]
 */
export function useBudgetSplit(preferencias, incomes = [], outcomes = [], anio, mes) {
  const now = new Date()
  const targetAnio = anio ?? now.getFullYear()
  const targetMes = mes ?? now.getMonth() + 1

  const { start, end, ym } = useMemo(() => monthRange(targetAnio, targetMes), [targetAnio, targetMes])

  const { data: rangeTotals, loading: loadingIngreso, error: errorIngreso, stale: staleIngreso } = useStats(
    () => fetchRangeTotals({ start, end }),
    [start, end],
    `range:${ym}`
  )

  const { data: byCategory, loading: loadingCategorias, error: errorCategorias, stale: staleCategorias } = useStats(
    () => fetchTotalsByCategory({ tipo: 'gasto', start, end }),
    [start, end],
    `by-category:gasto:${ym}`
  )

  const pending = useMemo(
    () => computePendingSplit(incomes, outcomes, { from: start, to: end }),
    [incomes, outcomes, start, end]
  )

  const ingresoMensual = toNumber(rangeTotals?.totalIngresos) + pending.ingresos

  const baldes = useMemo(
    () => computeBudgetSplit({
      totalsByCategory: byCategory || [],
      categoriaBaldes: preferencias.categoria_baldes,
      porcentajesBalde: preferencias.porcentajes_balde,
      ingresoMensual
    }),
    [byCategory, preferencias.categoria_baldes, preferencias.porcentajes_balde, ingresoMensual]
  )

  return {
    baldes,
    ingresoMensual,
    loading: loadingIngreso || loadingCategorias,
    stale: staleIngreso || staleCategorias,
    error: errorIngreso || errorCategorias,
    hasIngreso: ingresoMensual > 0,
    start,
    end,
    ym
  }
}
