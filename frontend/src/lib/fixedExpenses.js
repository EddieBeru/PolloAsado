// Checklist de gastos fijos: agrupa outcomes por grupo_recurrencia y calcula
// estado (pagado/pendiente/atrasado) para el ciclo indicado.

/**
 * Instancia más reciente de cada grupo_recurrencia activo (plantilla del fijo).
 * @param {Array} outcomes
 * @returns {Array<{grupo_recurrencia, concept, category, amount, dia_esperado}>}
 */
export function getFixedExpenseTemplates(outcomes = []) {
  const fijos = outcomes.filter(o => o.es_fijo && o.grupo_recurrencia)
  const byGroup = new Map()
  for (const o of fijos) {
    const existing = byGroup.get(o.grupo_recurrencia)
    if (!existing || o.date > existing.date) byGroup.set(o.grupo_recurrencia, o)
  }
  return Array.from(byGroup.values()).map(o => ({
    grupo_recurrencia: o.grupo_recurrencia,
    concept: o.concept,
    category: o.category,
    amount: o.amount,
    dia_esperado: o.dia_esperado
  }))
}

/**
 * Resuelve el día-del-mes `dia` (1-31) a la única fecha 'YYYY-MM-DD' dentro de
 * [start, end]. El corte por día de inicio del ciclo garantiza que cada
 * día-del-mes aparece exactamente una vez. Devuelve null si `dia` no cae nunca
 * (p. ej. dia=31 y el ciclo no toca ningún mes de 31 días) o si `dia` es null.
 */
function fechaEsperadaEnRango(dia, start, end) {
  if (dia == null) return null
  const [sy, sm] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  const candidatos = sy === ey && sm === em
    ? [[sy, sm]]
    : [[sy, sm], [ey, em]]
  for (const [y, m] of candidatos) {
    const ultimo = new Date(y, m, 0).getDate()
    if (dia > ultimo) continue
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    if (iso >= start && iso <= end) return iso
  }
  return null
}

/**
 * Estado de cada fijo para el ciclo [start, end].
 * @param {Array} outcomes
 * @param {{ start: string, end: string, hoy: string }} params  fechas en 'YYYY-MM-DD'
 * @returns {{ fijos: Array, hayAtrasados: boolean }}
 */
export function computeFixedExpensesStatus(outcomes = [], { start, end, hoy }) {
  const templates = getFixedExpenseTemplates(outcomes)
  const hoyEnCiclo = hoy >= start && hoy <= end

  const fijos = templates.map(t => {
    const pagado = outcomes.some(o =>
      o.grupo_recurrencia === t.grupo_recurrencia &&
      o.date && o.date >= start && o.date <= end
    )
    const fechaEsperada = fechaEsperadaEnRango(t.dia_esperado, start, end)
    const atrasado = !pagado && hoyEnCiclo && fechaEsperada != null && hoy > fechaEsperada
    return { ...t, pagado, atrasado }
  })

  return { fijos, hayAtrasados: fijos.some(f => f.atrasado) }
}
