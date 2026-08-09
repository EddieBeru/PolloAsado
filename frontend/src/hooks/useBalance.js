import { useState, useEffect, useMemo, useCallback } from 'react'
import localforage from 'localforage'
import { fetchBalance } from '../lib/stats'
import { computePendingDelta } from '../lib/balance'

// Cache del baseline del servidor (offline-first).
const balanceStore = localforage.createInstance({
  name: 'PolloAsado',
  storeName: 'balance'
})

const BASELINE_KEY = 'baseline_v1'
const todayStr = () => new Date().toISOString().split('T')[0]

/**
 * Balance "delta preciso": baseline del servidor + aporte de items pendientes.
 *
 * @param {object} user
 * @param {Array}  incomes  ingresos locales (incluye pendientes optimistas)
 * @param {Array}  outcomes gastos locales
 * @returns {{ balance, baseline, loading, stale, error, refreshing, refresh }}
 */
export function useBalance(user, incomes = [], outcomes = []) {
  const [baseline, setBaseline] = useState(null)
  const [loading, setLoading] = useState(true)
  // stale: estamos mostrando el baseline cacheado porque la revalidación falló.
  const [stale, setStale] = useState(false)
  // error: la revalidación falló y NO hay nada cacheado que mostrar.
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) return
    setRefreshing(true)

    // 1. Baseline cacheado -> disponible offline y al instante.
    let cached = null
    try {
      cached = await balanceStore.getItem(BASELINE_KEY)
    } catch (err) {
      // IndexedDB bloqueado (modo privado, cuota llena): seguimos contra la red.
      console.warn('No se pudo leer el balance cacheado:', err)
    }
    if (cached) {
      setBaseline(cached)
      setError(null)
    }
    setLoading(false)

    // 2. Revalidar contra el RPC (requiere red).
    try {
      const fresh = await fetchBalance({ hasta: todayStr() })
      setBaseline(fresh)
      setStale(false)
      setError(null)
      try {
        await balanceStore.setItem(BASELINE_KEY, fresh)
      } catch (err) {
        console.warn('No se pudo guardar el balance en caché:', err)
      }
    } catch (err) {
      // Con caché: seguimos mostrando el número viejo, marcado como desactualizado.
      // Sin caché: no hay balance que mostrar y hay que decirlo.
      if (cached) {
        setStale(true)
        setError(null)
      } else {
        setStale(false)
        setError(
          navigator.onLine
            ? 'No se pudo calcular tu balance.'
            : 'Sin conexión y sin datos guardados en este dispositivo.'
        )
      }
    } finally {
      setRefreshing(false)
    }
  }, [user])

  useEffect(() => {
    refresh().catch((err) => {
      console.error('Fallo inesperado al refrescar el balance:', err)
      setLoading(false)
      setRefreshing(false)
      setError('No se pudo calcular tu balance.')
    })
  }, [refresh])

  // Volver a intentar apenas regresa la conexión: el usuario no debería tener
  // que recargar para que el número se corrija solo.
  useEffect(() => {
    const onOnline = () => { refresh().catch(() => { }) }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [refresh])

  // balance = baseline del servidor + delta de pendientes locales (fecha <= hoy).
  const balance = useMemo(() => {
    const base = baseline?.balance ?? 0
    return base + computePendingDelta(incomes, outcomes, todayStr())
  }, [baseline, incomes, outcomes])

  return { balance, baseline, loading, stale, error, refreshing, refresh }
}
