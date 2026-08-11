const ONE_DAY_MS = 24 * 60 * 60 * 1000

function daysBetween(a, b) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / ONE_DAY_MS
}

/** Movimientos importados que calzan (monto + tipo + fecha ±1 día) con algo ya capturado a mano. */
export function findManualMatches(previewRows, existentes) {
  const matches = new Map()
  for (const row of previewRows) {
    if (row.invalid) continue
    const candidatos = existentes.filter(e =>
      e.tipo === row.tipo &&
      Number(e.monto) === Number(row.monto) &&
      daysBetween(e.fecha, row.fecha) <= 1
    )
    if (candidatos.length > 0) matches.set(row.id, candidatos)
  }
  return matches
}

/** Movimientos importados que podrían ser el mismo cargo dos veces (autorización + ajuste). */
export function findDoubleCharges(previewRows) {
  const flags = new Map()
  for (let i = 0; i < previewRows.length; i++) {
    const a = previewRows[i]
    if (a.invalid) continue
    const others = []
    for (let j = 0; j < previewRows.length; j++) {
      if (i === j) continue
      const b = previewRows[j]
      if (b.invalid) continue
      if (a.tipo === b.tipo && a.descripcionNormalizada === b.descripcionNormalizada && daysBetween(a.fecha, b.fecha) <= 2) {
        others.push(b.id)
      }
    }
    if (others.length > 0) flags.set(a.id, others)
  }
  return flags
}
