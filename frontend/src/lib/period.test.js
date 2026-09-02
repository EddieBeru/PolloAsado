import { describe, it, expect } from 'vitest'
import { monthRange, cycleRange, clampEndToday } from './period'

describe('monthRange', () => {
  it('devuelve el rango completo de un mes de 31 días', () => {
    expect(monthRange(2026, 1)).toEqual({ start: '2026-01-01', end: '2026-01-31', ym: '2026-01' })
  })

  it('devuelve el rango completo de febrero en año bisiesto', () => {
    expect(monthRange(2028, 2)).toEqual({ start: '2028-02-01', end: '2028-02-29', ym: '2028-02' })
  })

  it('devuelve el rango completo de febrero en año no bisiesto', () => {
    expect(monthRange(2026, 2)).toEqual({ start: '2026-02-01', end: '2026-02-28', ym: '2026-02' })
  })
})

describe('cycleRange', () => {
  it('con diaInicio=1 reproduce el mes calendario', () => {
    const r = cycleRange(1, 0, new Date(2026, 7, 15)) // 15 ago 2026
    expect(r.start).toBe('2026-08-01')
    expect(r.end).toBe('2026-08-31')
    expect(r.id).toBe('2026-08')
    expect(r.isCurrent).toBe(true)
  })

  it('con diaInicio=28 y hoy>=28, el ciclo va del 28 al 27 del mes siguiente', () => {
    const r = cycleRange(28, 0, new Date(2026, 7, 28)) // 28 ago 2026
    expect(r.start).toBe('2026-08-28')
    expect(r.end).toBe('2026-09-27')
    expect(r.id).toBe('2026-09') // 27 días en septiembre vs 4 en agosto
  })

  it('con diaInicio=28 y hoy<28, seguís en el ciclo que arrancó el mes pasado', () => {
    const r = cycleRange(28, 0, new Date(2026, 7, 15)) // 15 ago 2026
    expect(r.start).toBe('2026-07-28')
    expect(r.end).toBe('2026-08-27')
    expect(r.id).toBe('2026-08')
  })

  it('con diaInicio bajo (10) etiqueta el ciclo con el mes de inicio', () => {
    const r = cycleRange(10, 0, new Date(2026, 7, 15))
    expect(r.start).toBe('2026-08-10')
    expect(r.end).toBe('2026-09-09')
    expect(r.id).toBe('2026-08') // 22 días en agosto vs 9 en septiembre
  })

  it('empate en días -> mes posterior', () => {
    // día de inicio 16 arrancando en abril (30 días): abril 16..30 = 15 días,
    // mayo 1..15 = 15 días. Empate exacto -> gana el mes posterior (mayo).
    const r = cycleRange(16, 0, new Date(2026, 3, 20)) // 20 abr 2026
    expect(r.start).toBe('2026-04-16')
    expect(r.end).toBe('2026-05-15')
    expect(r.id).toBe('2026-05')
  })

  it('clampea el día de inicio en meses cortos (31 -> último de febrero)', () => {
    const r = cycleRange(31, 0, new Date(2026, 1, 10)) // 10 feb 2026 (no bisiesto)
    expect(r.start).toBe('2026-01-31')
    expect(r.end).toBe('2026-02-27') // día antes del 28, que es el anchor clampeado de feb
  })

  it('offset -1 devuelve el ciclo anterior completo', () => {
    const r = cycleRange(28, -1, new Date(2026, 7, 28))
    expect(r.start).toBe('2026-07-28')
    expect(r.end).toBe('2026-08-27')
    expect(r.isCurrent).toBe(false)
  })

  it('offset +1 cruza fin de año', () => {
    const r = cycleRange(15, 1, new Date(2026, 11, 20)) // 20 dic 2026, ciclo actual 15dic-14ene
    expect(r.start).toBe('2027-01-15')
    expect(r.end).toBe('2027-02-14')
  })
})

describe('clampEndToday', () => {
  it('recorta end a hoy cuando el ciclo es el actual y end es futuro', () => {
    const range = { start: '2026-08-01', end: '2026-08-31', id: '2026-08', label: 'agosto 2026', isCurrent: true }
    const r = clampEndToday(range, new Date(2026, 7, 15))
    expect(r.end).toBe('2026-08-15')
    expect(r.start).toBe('2026-08-01')
  })

  it('no recorta si el ciclo no es el actual', () => {
    const range = { start: '2026-07-01', end: '2026-07-31', id: '2026-07', label: 'julio 2026', isCurrent: false }
    const r = clampEndToday(range, new Date(2026, 7, 15))
    expect(r.end).toBe('2026-07-31')
  })

  it('no recorta si end ya es anterior a hoy', () => {
    const range = { start: '2026-08-01', end: '2026-08-31', id: '2026-08', label: 'agosto 2026', isCurrent: true }
    const r = clampEndToday(range, new Date(2026, 8, 10)) // 10 sep
    expect(r.end).toBe('2026-08-31')
  })
})
