import { normalizeDescripcion } from './normalize'

/** Primera regla del usuario cuyo patrón está contenido en la descripción normalizada. */
export function suggestCategory(descripcionNormalizada, tipo, reglas) {
  if (!descripcionNormalizada || !reglas || reglas.length === 0) return null
  const match = reglas.find(r => r.tipo === tipo && descripcionNormalizada.includes(r.patron))
  return match ? match.categoria : null
}

/** Mapa comercio normalizado -> categoría más frecuente, a partir de movimientos históricos {descripcion, categoria}. */
export function buildMerchantMap(historyRows) {
  const counts = new Map()
  for (const { descripcion, categoria } of historyRows || []) {
    if (!categoria) continue
    const merchant = normalizeDescripcion(descripcion)
    if (!merchant) continue
    if (!counts.has(merchant)) counts.set(merchant, new Map())
    const catCounts = counts.get(merchant)
    catCounts.set(categoria, (catCounts.get(categoria) || 0) + 1)
  }

  const merchantMap = new Map()
  for (const [merchant, catCounts] of counts) {
    let best = null
    let bestCount = 0
    for (const [categoria, count] of catCounts) {
      if (count > bestCount) {
        best = categoria
        bestCount = count
      }
    }
    merchantMap.set(merchant, best)
  }
  return merchantMap
}

/** Categorías sugeridas para el wizard: coincidencia por comercio primero, resto por frecuencia de uso, sin duplicados. */
export function rankCategories(descripcionNormalizada, merchantMap, frecuencias, limit = 5) {
  const ranked = []
  const merchantMatch = merchantMap?.get(descripcionNormalizada)
  if (merchantMatch) ranked.push(merchantMatch)

  for (const { categoria } of frecuencias || []) {
    if (ranked.length >= limit) break
    if (ranked.includes(categoria)) continue
    ranked.push(categoria)
  }

  return ranked.slice(0, limit)
}
