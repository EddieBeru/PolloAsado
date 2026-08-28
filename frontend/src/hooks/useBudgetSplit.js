import { useMemo } from 'react'
import { useStats } from './useStats'
import { fetchRangeTotals, fetchTotalsByCategory } from '../lib/stats'
import { computePendingSplit } from '../lib/balance'
import { computeBudgetSplit } from '../lib/budgetSplit'
import { toNumber } from '../lib/format'

/**
 * Balde 50/30/20 del ciclo activo. Usa el rango completo del ciclo (sin recorte a hoy).
 *
 * @param {{ start, end, id }} range  rango del ciclo, de useCycle()
 * @param {{categoria_baldes, porcentajes_balde}} preferencias
 * @param {Array} incomes  ingresos locales, para el delta pendiente
 * @param {Array} outcomes gastos locales, para el delta pendiente
 */
export function useBudgetSplit(range, preferencias, incomes = [], outcomes = []) {
  const { start, end, id } = range

  const { data: rangeTotals, loading: loadingIngreso, error: errorIngreso, stale: staleIngreso } = useStats(
    () => fetchRangeTotals({ start, end }),
    [start, end],
    `range:${start}:${end}`
  )

  const { data: byCategory, loading: loadingCategorias, error: errorCategorias, stale: staleCategorias } = useStats(
    () => fetchTotalsByCategory({ tipo: 'gasto', start, end }),
    [start, end],
    `by-category:gasto:${start}:${end}`
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
    ym: id
  }
}
