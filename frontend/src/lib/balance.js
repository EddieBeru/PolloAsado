// Helper puro para el balance "delta preciso" offline-first.
//
// El baseline del servidor (get_balance, fecha <= hoy) solo refleja filas ya
// sincronizadas. Los items locales pendientes (_isPendingSync truthy) todavía no
// están en el servidor, así que su aporte se suma aparte como "delta":
//
//   delta_item = amount - _deltaBase
//     _deltaBase = 0            para INSERT  (el baseline tenía 0)
//     _deltaBase = montoViejo   para UPDATE  (el baseline aún tiene el monto viejo)
//
// balance = baseline + Σ deltas de ingresos - Σ deltas de gastos  (solo fecha <= hoy)

const n = (v) => parseFloat(v ?? 0) || 0

/**
 * Suma de deltas pendientes dentro de un rango.
 *
 * Un item sin fecha se cuenta cuando el rango es abierto por la izquierda
 * (el acumulado), pero no cuando hay un `from`: sin fecha no se puede ubicar
 * dentro de un mes concreto y contarlo ahí sería inventar el dato.
 */
function sumPendingDelta(items, { from = null, to = null } = {}) {
  return items.reduce((acc, item) => {
    if (!item._isPendingSync) return acc
    if (item.date) {
      if (to && item.date > to) return acc // excluye proyecciones futuras
      if (from && item.date < from) return acc
    } else if (from) {
      return acc
    }
    return acc + (n(item.amount) - n(item._deltaBase))
  }, 0)
}

/**
 * Aporte de los items pendientes, separado por lado.
 *
 * El desglose de la UI se apoya en esto: los totales del servidor no conocen
 * los pendientes, así que sin este reparto "Ingresos - Gastos" no cuadraría
 * con el balance que se muestra arriba.
 *
 * @param {Array} incomes  ingresos locales (con amount, date, _isPendingSync, _deltaBase)
 * @param {Array} outcomes gastos locales
 * @param {{from?: string|null, to?: string|null}} range  fechas 'YYYY-MM-DD'
 * @returns {{ ingresos: number, gastos: number }}
 */
export function computePendingSplit(incomes = [], outcomes = [], range = {}) {
  return {
    ingresos: sumPendingDelta(incomes, range),
    gastos: sumPendingDelta(outcomes, range),
  }
}

/**
 * Aporte neto de los items pendientes al balance.
 * @param {Array} incomes  ingresos locales
 * @param {Array} outcomes gastos locales
 * @param {string} today    fecha 'YYYY-MM-DD'
 * @returns {number}
 */
export function computePendingDelta(incomes = [], outcomes = [], today) {
  const { ingresos, gastos } = computePendingSplit(incomes, outcomes, { to: today })
  return ingresos - gastos
}
