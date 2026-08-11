/**
 * Motor de consejos basado en reglas, sin IA. Máx 2 mensajes, en orden de prioridad.
 * @param {Object} params
 * @param {Object} params.baldes  {necesidad, gusto, ahorro} de computeBudgetSplit
 * @param {Array<{nombre, monto_meta, monto_actual}>} params.metasAhorro
 * @returns {string[]}
 */
export function generarConsejos({ baldes, metasAhorro = [] }) {
  const excedidos = ['necesidad', 'gusto'].filter(b => baldes[b].gastado > baldes[b].techo)
  if (excedidos.length > 0) {
    const nombres = { necesidad: 'necesidades', gusto: 'gustos' }
    const partes = excedidos.map(b => {
      const exceso = baldes[b].gastado - baldes[b].techo
      return `${nombres[b]} por ₡${Math.round(exceso).toLocaleString('es-CR')}`
    })
    return [`Este mes ya pasaste el límite de ${partes.join(' y ')}.`]
  }

  const libreGusto = baldes.gusto.techo - baldes.gusto.gastado
  if (libreGusto > 0) {
    const metaActiva = metasAhorro.find(m => m.monto_actual < m.monto_meta)
    if (metaActiva) {
      const faltante = metaActiva.monto_meta - metaActiva.monto_actual
      const meses = Math.ceil(faltante / libreGusto)
      return [
        `Te quedan ₡${Math.round(libreGusto).toLocaleString('es-CR')} libres en gustos. A este ritmo le faltan ${meses} ${meses === 1 ? 'mes' : 'meses'} a tu meta "${metaActiva.nombre}" — capaz mandás parte pa' allá.`
      ]
    }
    return [`Te quedan ₡${Math.round(libreGusto).toLocaleString('es-CR')} libres este mes.`]
  }

  return []
}
