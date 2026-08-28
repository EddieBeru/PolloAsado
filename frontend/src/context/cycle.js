import { createContext, useContext } from 'react'

/** Entero en [1, 31]; 1 si el valor no sirve. */
export function normalizeDiaInicio(value) {
  const n = Math.trunc(Number(value))
  if (!Number.isFinite(n)) return 1
  return Math.min(Math.max(n, 1), 31)
}

export const CycleContext = createContext(null)

export function useCycle() {
  const ctx = useContext(CycleContext)
  if (!ctx) throw new Error('useCycle debe usarse dentro de <CycleProvider>')
  return ctx
}
