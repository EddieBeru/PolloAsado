/**
 * Extrae el nombre de comercio de una descripción cruda de BCR.
 * Formato típico: "COMPRAS EN COMERCIOS / <código terminal> +<NNN><comercio>".
 * Solo corta en el primer "/" — el nombre del comercio puede traer otro "/" (ej. dominios).
 */
export function normalizeDescripcion(raw) {
  const cleaned = (raw || '').trim().toUpperCase().replace(/\s+/g, ' ')
  if (!cleaned) return ''

  const slashIndex = cleaned.indexOf('/')
  const tail = slashIndex >= 0 ? cleaned.slice(slashIndex + 1).trim() : cleaned

  const merchant = tail
    .replace(/^\d+\s*/, '')
    .replace(/^\+\d{3}\s*/, '')
    .trim()

  return merchant || cleaned
}
