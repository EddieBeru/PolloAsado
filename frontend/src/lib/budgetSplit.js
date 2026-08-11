const BALDES = ['necesidad', 'gusto', 'ahorro']

/**
 * Reparto 50/30/20 a partir de totales por categoría del mes.
 * @param {Object} params
 * @param {Array<{categoria, total}>} params.totalsByCategory
 * @param {Object<string,string>} params.categoriaBaldes
 * @param {Object<string,number>} params.porcentajesBalde
 * @param {number} params.ingresoMensual
 * @returns {{necesidad:{gastado,techo}, gusto:{...}, ahorro:{...}}}
 */
export function computeBudgetSplit({ totalsByCategory = [], categoriaBaldes = {}, porcentajesBalde = {}, ingresoMensual = 0 }) {
  const gastado = { necesidad: 0, gusto: 0, ahorro: 0 }

  for (const row of totalsByCategory) {
    let balde = categoriaBaldes[row.categoria]
    if (!balde || !BALDES.includes(balde)) {
      if (import.meta.env.DEV) {
        console.warn(`Categoría "${row.categoria}" sin balde asignado, se cuenta como "gusto".`)
      }
      balde = 'gusto'
    }
    gastado[balde] += row.total
  }

  const result = {}
  for (const balde of BALDES) {
    const pct = porcentajesBalde[balde] || 0
    result[balde] = {
      gastado: gastado[balde],
      techo: ingresoMensual * (pct / 100)
    }
  }
  return result
}
