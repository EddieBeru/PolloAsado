import { useMemo } from 'react'
import { useStats } from './useStats'
import { fetchRangeTotals } from '../lib/stats'
import { computePendingSplit } from '../lib/balance'
import { monthToDateRange } from '../lib/period'
import { toNumber } from '../lib/format'

/**
 * Ingresos y gastos de lo que va del mes (día 1 -> hoy).
 *
 * Mismo criterio que el acumulado: los totales vienen del servidor y los items
 * locales pendientes se suman aparte, para que el mes no se quede corto cuando
 * se registró algo sin conexión.
 *
 * @param {Array} incomes  ingresos locales
 * @param {Array} outcomes gastos locales
 * @returns {{ ingresos, gastos, neto, hasData, loading, stale, error, refresh, start, end, ym }}
 */
export function useMonthTotals(incomes = [], outcomes = []) {
  const { start, end, ym } = useMemo(() => monthToDateRange(), [])

  const { data, loading, error, stale, refresh } = useStats(
    () => fetchRangeTotals({ start, end }),
    [start, end],
    `range:${ym}`
  )

  const pending = useMemo(
    () => computePendingSplit(incomes, outcomes, { from: start, to: end }),
    [incomes, outcomes, start, end]
  )

  const ingresos = toNumber(data?.totalIngresos) + pending.ingresos
  const gastos = toNumber(data?.totalGastos) + pending.gastos

  return {
    ingresos,
    gastos,
    neto: ingresos - gastos,
    // Sin snapshot del servidor solo tendríamos los pendientes locales: eso no
    // es "el mes", así que la UI tiene que poder distinguirlo.
    hasData: data != null,
    loading,
    stale,
    error,
    refresh,
    start,
    end,
    ym,
  }
}
