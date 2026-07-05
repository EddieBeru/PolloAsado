import { useState, useEffect, useRef } from 'react'
import localforage from 'localforage'

// Store dedicado para snapshots de estadísticas (offline-first).
const statsStore = localforage.createInstance({
  name: 'PolloAsado',
  storeName: 'stats'
})

/**
 * Hook genérico offline-first sobre las funciones de stats.js.
 *
 * @param {Function} fetcher  Función async que retorna los datos (ej. () => fetchBalance()).
 * @param {Array}    deps     Dependencias que re-disparan el fetch.
 * @param {string}   cacheKey Key única del snapshot en localforage (ej. 'series:month:2026').
 *
 * @returns {{ data, loading, error, stale, refresh }}
 *   - Muestra el snapshot cacheado al instante (stale=true) mientras revalida.
 *   - Si el RPC falla (offline), mantiene el cache y stale=true.
 */
export function useStats(fetcher, deps = [], cacheKey) {
  const [state, setState] = useState({ data: null, loading: true, error: null, stale: false })
  const [tick, setTick] = useState(0)
  const depsKey = JSON.stringify(deps)

  // El fetcher suele ser una arrow inline (cambia cada render); lo mantenemos en un
  // ref actualizado en efecto para no re-disparar el fetch salvo por deps/cacheKey.
  const fetcherRef = useRef(fetcher)
  useEffect(() => { fetcherRef.current = fetcher })

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      // 1. Snapshot cacheado -> render inmediato.
      if (cacheKey) {
        const cached = await statsStore.getItem(cacheKey)
        if (!cancelled && cached !== null && cached !== undefined) {
          setState(s => ({ ...s, data: cached, stale: true }))
        }
      }
      // 2. Revalidar contra el RPC.
      try {
        const fresh = await fetcherRef.current()
        if (cancelled) return
        setState({ data: fresh, loading: false, error: null, stale: false })
        if (cacheKey) await statsStore.setItem(cacheKey, fresh)
      } catch (err) {
        // 3. Offline / error -> conservar snapshot cacheado.
        if (cancelled) return
        setState(s => ({ ...s, loading: false, error: err, stale: true }))
      }
    }
    run()
    return () => { cancelled = true }
  }, [cacheKey, depsKey, tick])

  return { ...state, refresh: () => setTick(t => t + 1) }
}
