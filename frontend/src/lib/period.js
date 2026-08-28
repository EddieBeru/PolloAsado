// Rangos de fecha para las vistas de resumen.
//
// Se construyen con componentes locales (no con toISOString) para que el "hoy"
// del usuario y el del servidor coincidan: un toISOString() a las 8pm en CR
// devuelve ya el día siguiente en UTC y el mes en curso se corre un día.

import { formatMonth } from './format'

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

/** Rango completo de un mes calendario. anio: 4 dígitos, mes: 1-12. */
export function monthRange(anio, mes) {
  const ym = `${anio}-${pad(mes)}`
  const start = `${ym}-01`
  const lastDay = new Date(anio, mes, 0).getDate()
  const end = `${ym}-${pad(lastDay)}`
  return { start, end, ym }
}

/** Último día (1-31) del mes. mes: 1-12. */
function lastDayOfMonth(anio, mes) {
  return new Date(anio, mes, 0).getDate()
}

/** Día de inicio clampeado al último día que existe en ese mes. */
function clampDay(dia, anio, mes) {
  return Math.min(dia, lastDayOfMonth(anio, mes))
}

/** Suma `n` días (puede ser negativo) a un 'YYYY-MM-DD' y devuelve otro 'YYYY-MM-DD'. */
function addDaysISO(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  return toISODate(new Date(y, m - 1, d + n))
}

/** 'YYYY-MM' del mes calendario con más días dentro de [start, end]. Empate -> mes posterior. */
function dominantMonthId(start, end) {
  const [sy, sm] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  if (sy === ey && sm === em) return `${sy}-${pad(sm)}`
  const startDay = Number(start.slice(8, 10))
  const endDay = Number(end.slice(8, 10))
  const diasMesInicio = lastDayOfMonth(sy, sm) - startDay + 1
  const diasMesFin = endDay
  return diasMesFin >= diasMesInicio ? `${ey}-${pad(em)}` : `${sy}-${pad(sm)}`
}

/**
 * Ciclo de "mes financiero" que arranca el día `diaInicio` de cada mes.
 *
 * offset 0 = ciclo que contiene `now`; -1 = el anterior; +1 = el siguiente.
 * El desplazamiento se hace recorriendo meses (no sumando días a las fechas),
 * porque los ciclos no miden lo mismo según la longitud de cada mes.
 *
 * @returns {{ start: string, end: string, id: string, label: string, isCurrent: boolean }}
 */
export function cycleRange(diaInicio, offset = 0, now = new Date()) {
  const dia = Math.min(Math.max(Math.trunc(Number(diaInicio) || 1), 1), 31)

  // Mes en que arrancó el ciclo que contiene `now` (antes de aplicar offset).
  let anio = now.getFullYear()
  let mes = now.getMonth() + 1
  if (now.getDate() < clampDay(dia, anio, mes)) {
    mes -= 1
    if (mes === 0) { mes = 12; anio -= 1 }
  }

  // Aplicar offset en meses.
  const totalMeses = anio * 12 + (mes - 1) + offset
  anio = Math.floor(totalMeses / 12)
  mes = (totalMeses % 12) + 1

  const start = `${anio}-${pad(mes)}-${pad(clampDay(dia, anio, mes))}`

  let nAnio = anio
  let nMes = mes + 1
  if (nMes === 13) { nMes = 1; nAnio += 1 }
  const nextStart = `${nAnio}-${pad(nMes)}-${pad(clampDay(dia, nAnio, nMes))}`
  const end = addDaysISO(nextStart, -1)

  const id = dominantMonthId(start, end)
  return { start, end, id, label: formatMonth(id), isCurrent: offset === 0 }
}

/**
 * Recorta el fin del rango a "hoy", pero SOLO si es el ciclo en curso.
 * Los ciclos navegados (pasados/futuros) se devuelven intactos.
 */
export function clampEndToday(range, now = new Date()) {
  if (!range.isCurrent) return range
  const hoy = toISODate(now)
  return range.end > hoy ? { ...range, end: hoy } : range
}
