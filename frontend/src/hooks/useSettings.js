import { useState, useEffect } from 'react'
import localforage from 'localforage'

// Store global para preferencias
const settingsStore = localforage.createInstance({
  name: 'PolloAsado',
  storeName: 'settings'
})

const DEFAULT_SETTINGS = {
  divisa_principal: 'CRC',
  divisas_activas: ['CRC', 'USD'],
  cached_rates: {} // Ej. { 'usd_to_crc': 511.05 }
}

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSettings = async () => {
      const localSettings = await settingsStore.getItem('user_settings')
      if (localSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...localSettings })
      } else {
        await settingsStore.setItem('user_settings', DEFAULT_SETTINGS)
      }
      setLoading(false)
    }
    loadSettings()
  }, [])

  const updateSettings = async (newSettingsObj) => {
    const merged = { ...settings, ...newSettingsObj }
    setSettings(merged)
    await settingsStore.setItem('user_settings', merged)
  }

  // Funciones específicas para tasas cacheadas
  const getCachedRate = (from, to) => {
    const key = `${from}_to_${to}`.toLowerCase()
    return settings.cached_rates[key] || null
  }

  const setCachedRate = async (from, to, rate) => {
    const key = `${from}_to_${to}`.toLowerCase()
    const newRates = { ...settings.cached_rates, [key]: rate }
    await updateSettings({ cached_rates: newRates })
  }

  return { settings, loading, updateSettings, getCachedRate, setCachedRate }
}
