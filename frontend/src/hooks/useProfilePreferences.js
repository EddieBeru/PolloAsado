import { useState, useEffect } from 'react'
import localforage from 'localforage'
import { supabase } from '../lib/supabaseClient'

const preferenciasStore = localforage.createInstance({
  name: 'PolloAsado',
  storeName: 'preferencias'
})

const DEFAULT_CATEGORIA_BALDES = {
  Vivienda: 'necesidad',
  Servicios: 'necesidad',
  Salud: 'necesidad',
  Transporte: 'necesidad',
  Alimentación: 'necesidad',
  Entretenimiento: 'gusto',
  Ropa: 'gusto',
  Educación: 'gusto',
  Otros: 'gusto'
}

const DEFAULT_PORCENTAJES_BALDE = { necesidad: 50, gusto: 30, ahorro: 20 }

export function useProfilePreferences(user) {
  const [preferencias, setPreferencias] = useState({
    categoria_baldes: DEFAULT_CATEGORIA_BALDES,
    porcentajes_balde: DEFAULT_PORCENTAJES_BALDE
  })
  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      const cached = await preferenciasStore.getItem('preferencias')
      if (cached && isMounted) setPreferencias(cached)

      if (!user) { if (isMounted) setLoading(false); return }

      const { data, error } = await supabase
        .from('perfiles')
        .select('preferencias')
        .eq('id', user.id)
        .maybeSingle()

      if (!isMounted) return

      if (error) {
        setSyncError(
          navigator.onLine
            ? 'No se pudieron traer tus preferencias de la nube. Mostrando la copia local.'
            : 'Sin conexión. Mostrando la copia guardada en este dispositivo.'
        )
        setLoading(false)
        return
      }

      // data === null: todavía no existe fila de perfiles para este usuario
      // (nada la crea en el signup hoy). El primer updatePreferencias la crea.
      if (data) {
        const remote = data.preferencias || {}
        const merged = {
          categoria_baldes: remote.categoria_baldes || DEFAULT_CATEGORIA_BALDES,
          porcentajes_balde: remote.porcentajes_balde || DEFAULT_PORCENTAJES_BALDE
        }
        setPreferencias(merged)
        await preferenciasStore.setItem('preferencias', merged)
      }
      setSyncError(null)
      setLoading(false)
    }
    load()
    return () => { isMounted = false }
  }, [user])

  const updatePreferencias = async (updates) => {
    const merged = { ...preferencias, ...updates }
    setPreferencias(merged)
    await preferenciasStore.setItem('preferencias', merged)

    if (!user) return

    const { data: current } = await supabase
      .from('perfiles')
      .select('preferencias')
      .eq('id', user.id)
      .maybeSingle()

    const { error } = await supabase
      .from('perfiles')
      .upsert({ id: user.id, preferencias: { ...(current?.preferencias || {}), ...merged } }, { onConflict: 'id' })

    if (error) {
      console.error('No se pudo guardar preferencias en la nube:', error)
      setSyncError('No se pudo guardar en la nube. Tus cambios siguen acá; reintentá al volver a tener señal.')
    } else {
      setSyncError(null)
    }
  }

  return { preferencias, loading, syncError, updatePreferencias }
}
