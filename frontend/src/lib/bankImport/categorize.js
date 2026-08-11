/** Primera regla del usuario cuyo patrón está contenido en la descripción normalizada. */
export function suggestCategory(descripcionNormalizada, tipo, reglas) {
  if (!descripcionNormalizada || !reglas || reglas.length === 0) return null
  const match = reglas.find(r => r.tipo === tipo && descripcionNormalizada.includes(r.patron))
  return match ? match.categoria : null
}
