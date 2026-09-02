import { useState, useMemo, useCallback } from 'react'
import { useProfilePreferences } from '../hooks/useProfilePreferences'
import { cycleRange } from '../lib/period'
import { CycleContext, normalizeDiaInicio } from './cycle'

export function CycleProvider({ user, children }) {
  const { preferencias, loading: prefsLoading } = useProfilePreferences(user)
  const diaInicio = normalizeDiaInicio(preferencias?.dia_inicio_ciclo)

  const [offset, setOffset] = useState(0)

  // Cambiar el día de inicio redefine qué significa cada offset: volvemos al
  // actual. Se ajusta en render (no en efecto) siguiendo el patrón de React
  // para "estado derivado de props que cambian".
  const [prevDia, setPrevDia] = useState(diaInicio)
  if (diaInicio !== prevDia) {
    setPrevDia(diaInicio)
    setOffset(0)
  }

  const range = useMemo(() => cycleRange(diaInicio, offset), [diaInicio, offset])

  const goPrev = useCallback(() => setOffset(o => o - 1), [])
  const goNext = useCallback(() => setOffset(o => o + 1), [])
  const goToCurrent = useCallback(() => setOffset(0), [])

  const value = useMemo(
    () => ({ range, offset, goPrev, goNext, goToCurrent, diaInicio, prefsLoading }),
    [range, offset, goPrev, goNext, goToCurrent, diaInicio, prefsLoading]
  )

  return <CycleContext.Provider value={value}>{children}</CycleContext.Provider>
}
