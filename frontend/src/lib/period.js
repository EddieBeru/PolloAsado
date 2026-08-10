// Rangos de fecha para las vistas de resumen.
//
// Se construyen con componentes locales (no con toISOString) para que el "hoy"
// del usuario y el del servidor coincidan: un toISOString() a las 8pm en CR
// devuelve ya el día siguiente en UTC y el mes en curso se corre un día.

const pad = (n) => String(n).padStart(2, '0')

/** Date -> 'YYYY-MM-DD' en hora local. */
export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Hoy en hora local, 'YYYY-MM-DD'. */
export function today(now = new Date()) {
  return toISODate(now)
}

/**
 * Lo que va del mes: del día 1 a hoy, ambos inclusive.
 *
 * Se corta en hoy (no en el fin de mes) para que el rango no incluya montos
 * con fecha futura dentro del mismo mes; esos todavía no ocurrieron.
 *
 * @returns {{ start: string, end: string, ym: string }}
 */
export function monthToDateRange(now = new Date()) {
  const ym = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
  return { start: `${ym}-01`, end: toISODate(now), ym }
}
