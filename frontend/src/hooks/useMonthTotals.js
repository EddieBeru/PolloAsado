import { useMemo } from 'react'
import { useStats } from './useStats'
import { fetchRangeTotals } from '../lib/stats'
import { computePendingSplit } from '../lib/balance'
import { clampEndToday } from '../lib/period'
import { toNumber } from '../lib/format'

/**
 * Ingresos y gastos del ciclo activo (día de inicio -> hoy si es el ciclo en curso).
 *
 * Mismo criterio que el acumulado: los totales vienen del servidor y los items
 * locales pendientes se suman aparte, para que el ciclo no se quede corto cuando
 * se registró algo sin conexión.
 *
 * @param {{ start, end, id, isCurrent }} range  rango del ciclo, de useCycle()
 * @param {Array} incomes  ingresos locales
 * @param {Array} outcomes gastos locales
 * @returns {{ ingresos, gastos, neto, hasData, loading, stale, error, refresh, start, end, ym }}
 */
export function useMonthTotals(range, incomes = [], outcomes = []) {
  const { start, end, id } = useMemo(() => clampEndToday(range), [range])

  const { data, loading, error, stale, refresh } = useStats(
    () => fetchRangeTotals({ start, end }),
    [start, end],
    `range:${start}:${end}`
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
    // es "el ciclo", así que la UI tiene que poder distinguirlo.
    hasData: data != null,
    loading,
    stale,
    error,
    refresh,
    start,
    end,
    ym: id,
  }
}
