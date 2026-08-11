import { useState, useEffect } from 'react'
import localforage from 'localforage'
import { supabase } from '../lib/supabaseClient'
import { toNumber } from '../lib/format'

const savingsStore = localforage.createInstance({
  name: 'PolloAsado',
  storeName: 'savings'
})

export function useSavings(user) {
  const [savings, setSavings] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState(null)

  const persist = async (list) => {
    try {
      await savingsStore.setItem('savings_list', list)
    } catch (err) {
      console.error('No se pudo guardar la caché de metas de ahorro:', err)
      setSyncError('No se pudo guardar en este dispositivo. Sincronizá antes de cerrar la app.')
    }
  }

  const loadLocalData = async () => {
    let localData = []
    try {
      localData = (await savingsStore.getItem('savings_list')) || []
    } catch (err) {
      console.error('No se pudo leer la caché de metas de ahorro:', err)
      setSyncError('No se pudo leer el almacenamiento de este dispositivo.')
    }
    setSavings(localData)
    setLoading(false)
    return localData
  }

  const pullRemote = async () => {
    if (!user) return null
    const { data: remote, error: fetchError } = await supabase
      .from('ahorros')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError || !remote) {
      console.error('Error trayendo metas de ahorro:', fetchError)
      setSyncError(
        navigator.onLine
          ? 'No se pudieron traer tus metas de ahorro de la nube. Estás viendo la copia local.'
          : 'Sin conexión. Estás viendo la copia guardada en este dispositivo.'
      )
      return null
    }

    const formattedRemote = remote.map(item => ({ ...item, _isPendingSync: false }))

    const localData = (await savingsStore.getItem('savings_list')) || []
    const remoteIds = new Set(formattedRemote.map(r => r.id))
    const pendingKept = localData.filter(l => l._isPendingSync && !remoteIds.has(l.id))
    const merged = [...pendingKept, ...formattedRemote]

    setSyncError(null)
    await persist(merged)
    setSavings(merged)
    return merged.length
  }

  const syncWithSupabase = async (localData) => {
    if (!user) return
    setIsSyncing(true)
    let failedPushes = 0

    try {
      const pendingItems = localData.filter(item => item._isPendingSync)

      for (const item of pendingItems) {
        const syncType = item._isPendingSync
        const { _isPendingSync, ...dbData } = item

        if (syncType === 'UPDATE') {
          const { error: updateError } = await supabase.from('ahorros').update(dbData).eq('id', item.id)
          if (updateError) { console.error('Error actualizando meta de ahorro:', updateError); failedPushes++; continue }
        } else {
          const { error: insertError } = await supabase.from('ahorros').insert([dbData])
          if (insertError) { console.error('Error insertando meta de ahorro:', insertError); failedPushes++; continue }
        }
      }

      await pullRemote()

      if (failedPushes > 0) {
        setSyncError(
          failedPushes === 1
            ? 'Una meta de ahorro quedó guardada solo en este dispositivo. Se reintentará.'
            : `${failedPushes} metas de ahorro quedaron guardadas solo en este dispositivo. Se reintentarán.`
        )
      }
    } catch (error) {
      console.error('Fallo en sincronización de metas de ahorro:', error)
      setSyncError(
        navigator.onLine
          ? 'No se pudo sincronizar con la nube. Tus datos siguen guardados aquí.'
          : 'Sin conexión. Tus cambios se subirán cuando vuelva la señal.'
      )
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    loadLocalData().then(localData => {
      if (isMounted) syncWithSupabase(localData)
    })
    return () => { isMounted = false }
  }, [user])

  const addSaving = async (formData) => {
    if (!user) return
    const newItem = {
      id: crypto.randomUUID(),
      user_id: user.id,
      nombre: formData.nombre,
      monto_meta: toNumber(formData.monto_meta),
      monto_actual: toNumber(formData.monto_actual),
      es_automatico: !!formData.es_automatico,
      frecuencia: formData.es_automatico ? formData.frecuencia : null,
      monto_automatico: formData.es_automatico ? toNumber(formData.monto_automatico) : null,
      _isPendingSync: true
    }
    const updated = [newItem, ...savings]
    setSavings(updated)
    await persist(updated)
    syncWithSupabase(updated)
  }

  const updateSaving = async (id, formData) => {
    if (!user) return
    const updated = savings.map(s => s.id === id ? {
      ...s,
      nombre: formData.nombre,
      monto_meta: toNumber(formData.monto_meta),
      es_automatico: !!formData.es_automatico,
      frecuencia: formData.es_automatico ? formData.frecuencia : null,
      monto_automatico: formData.es_automatico ? toNumber(formData.monto_automatico) : null,
      _isPendingSync: s._isPendingSync === true ? true : 'UPDATE'
    } : s)
    setSavings(updated)
    await persist(updated)
    syncWithSupabase(updated)
  }

  const abonarSaving = async (id, monto) => {
    if (!user) return
    const target = savings.find(s => s.id === id)
    if (!target) return
    const updated = savings.map(s => s.id === id ? {
      ...s,
      monto_actual: toNumber(s.monto_actual) + toNumber(monto),
      _isPendingSync: s._isPendingSync === true ? true : 'UPDATE'
    } : s)
    setSavings(updated)
    await persist(updated)
    syncWithSupabase(updated)
  }

  return { savings, loading, isSyncing, syncError, addSaving, updateSaving, abonarSaving }
}
