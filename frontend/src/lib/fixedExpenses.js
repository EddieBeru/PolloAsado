// Checklist de gastos fijos: agrupa outcomes por grupo_recurrencia y calcula
// estado (pagado/pendiente/atrasado) para el mes indicado.

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
 * Estado de cada fijo para el mes/año dados.
 * @param {Array} outcomes
 * @param {{anio: number, mes: number, hoy: string}} params  hoy en 'YYYY-MM-DD'
 * @returns {{ fijos: Array, hayAtrasados: boolean }}
 */
export function computeFixedExpensesStatus(outcomes = [], { anio, mes, hoy }) {
  const templates = getFixedExpenseTemplates(outcomes)
  const ym = `${anio}-${String(mes).padStart(2, '0')}`
  const diaHoy = Number(hoy.slice(8, 10))
  const hoyEsDelMes = hoy.slice(0, 7) === ym

  const fijos = templates.map(t => {
    const pagado = outcomes.some(o =>
      o.grupo_recurrencia === t.grupo_recurrencia &&
      o.date && o.date.slice(0, 7) === ym
    )
    const atrasado = !pagado && hoyEsDelMes && t.dia_esperado != null && diaHoy > t.dia_esperado
    return { ...t, pagado, atrasado }
  })

  return { fijos, hayAtrasados: fijos.some(f => f.atrasado) }
}
