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

function sumPendingDelta(items, today) {
  return items.reduce((acc, item) => {
    if (!item._isPendingSync) return acc
    if (item.date && item.date > today) return acc // excluye proyecciones futuras
    return acc + (n(item.amount) - n(item._deltaBase))
  }, 0)
}

/**
 * Aporte neto de los items pendientes al balance.
 * @param {Array} incomes  ingresos locales (con amount, date, _isPendingSync, _deltaBase)
 * @param {Array} outcomes gastos locales
 * @param {string} today    fecha 'YYYY-MM-DD'
 * @returns {number}
 */
export function computePendingDelta(incomes = [], outcomes = [], today) {
  return sumPendingDelta(incomes, today) - sumPendingDelta(outcomes, today)
}
