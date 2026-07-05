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
 * @returns {{ balance, baseline, loading, stale, refresh }}
 */
export function useBalance(user, incomes = [], outcomes = []) {
  const [baseline, setBaseline] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stale, setStale] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) return
    // 1. Baseline cacheado -> disponible offline y al instante.
    const cached = await balanceStore.getItem(BASELINE_KEY)
    if (cached) {
      setBaseline(cached)
      setStale(true)
    }
    setLoading(false)
    // 2. Revalidar contra el RPC (requiere red).
    try {
      const fresh = await fetchBalance({ hasta: todayStr() })
      setBaseline(fresh)
      setStale(false)
      await balanceStore.setItem(BASELINE_KEY, fresh)
    } catch {
      // Offline: conservar el baseline cacheado.
      setStale(true)
    }
  }, [user])

  useEffect(() => {
    refresh().catch(() => {})
  }, [refresh])

  // balance = baseline del servidor + delta de pendientes locales (fecha <= hoy).
  const balance = useMemo(() => {
    const base = baseline?.balance ?? 0
    return base + computePendingDelta(incomes, outcomes, todayStr())
  }, [baseline, incomes, outcomes])

  return { balance, baseline, loading, stale, refresh }
}
