import { useMemo } from 'react'
import { useStats } from './useStats'
import { fetchTopCategories } from '../lib/stats'
import { monthToDateRange } from '../lib/period'
import { toNumber } from '../lib/format'

// Se piden más categorías de las que se muestran: con la lista casi completa se
// puede calcular un "Otras" honesto en vez de dejar un resto invisible.
const FETCH_LIMIT = 50

export const SIN_CATEGORIA = 'Sin categoría'

/**
 * Gasto del mes agrupado por categoría, mayor primero.
 *
 * Los gastos locales pendientes se mezclan en el conteo del servidor para que
 * una categoría recién usada aparezca al instante, aunque no haya red.
 *
 * @param {Array} outcomes gastos locales
 * @returns {{ categories: Array<{categoria, total, cantidad}>, hasData, loading, stale, error, refresh }}
 */
export function useSpendingByCategory(outcomes = []) {
  const { start, end, ym } = useMemo(() => monthToDateRange(), [])

  const { data, loading, error, stale, refresh } = useStats(
    () => fetchTopCategories({ tipo: 'gasto', limit: FETCH_LIMIT, start, end }),
    [start, end],
    `cats:gasto:${ym}`
  )

  const categories = useMemo(() => {
    const merged = new Map()

    for (const row of data ?? []) {
      const key = row.categoria || SIN_CATEGORIA
      merged.set(key, { categoria: key, total: toNumber(row.total), cantidad: toNumber(row.cantidad) })
    }

    for (const item of outcomes) {
      if (!item._isPendingSync) continue
      if (item.date && (item.date < start || item.date > end)) continue
      if (!item.date) continue
      const key = item.category || SIN_CATEGORIA
      const prev = merged.get(key) ?? { categoria: key, total: 0, cantidad: 0 }
      merged.set(key, {
        categoria: key,
        total: prev.total + (toNumber(item.amount) - toNumber(item._deltaBase)),
        // Una edición pendiente cambia el monto, no la cantidad de gastos.
        cantidad: prev.cantidad + (toNumber(item._deltaBase) ? 0 : 1),
      })
    }

    return [...merged.values()]
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [data, outcomes, start, end])

  return { categories, hasData: data != null, loading, stale, error, refresh }
}
