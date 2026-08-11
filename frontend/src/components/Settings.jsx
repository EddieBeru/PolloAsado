import { useState, useEffect } from 'react'
import localforage from 'localforage'
import { useSettings } from '../hooks/useSettings'
import { useProfilePreferences } from '../hooks/useProfilePreferences'
import { CATEGORIAS_GASTO } from '../lib/categorias'
import { toNumber } from '../lib/format'

// Stores locales que se borran al limpiar la caché. Las preferencias
// (`settings`) se conservan a propósito: no son datos descargables de la nube.
const CACHE_STORES = ['incomes', 'outcomes', 'balance']

export default function Settings({ user, onLogout }) {
  const { settings, loading, updateSettings } = useSettings()
  const { preferencias, loading: loadingPrefs, syncError: prefsSyncError, updatePreferencias } = useProfilePreferences(user)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [baldesDraft, setBaldesDraft] = useState(null)
  const [porcentajesDraft, setPorcentajesDraft] = useState(null)
  const [baldesError, setBaldesError] = useState(null)

  const categoriaBaldes = baldesDraft || preferencias.categoria_baldes
  const porcentajesBalde = porcentajesDraft || preferencias.porcentajes_balde

  const handleBaldeChange = (categoria, balde) => {
    setBaldesDraft({ ...categoriaBaldes, [categoria]: balde })
  }

  const handlePorcentajeChange = (balde, value) => {
    setPorcentajesDraft({ ...porcentajesBalde, [balde]: toNumber(value, 0) })
  }

  const handleGuardarBaldes = async () => {
    const suma = (porcentajesBalde.necesidad || 0) + (porcentajesBalde.gusto || 0) + (porcentajesBalde.ahorro || 0)
    if (suma !== 100) {
      setBaldesError(`Los porcentajes suman ${suma}%. Tienen que sumar 100%.`)
      return
    }
    setBaldesError(null)
    await updatePreferencias({ categoria_baldes: categoriaBaldes, porcentajes_balde: porcentajesBalde })
    setBaldesDraft(null)
    setPorcentajesDraft(null)
  }
  const [categories, setCategories] = useState({
    ingreso: ['Salario', 'Negocio', 'Inversiones', 'Regalos', 'Otros'],
    gasto: ['Comida', 'Transporte', 'Vivienda', 'Entretenimiento', 'Hormiga']
  })

  const [newCat, setNewCat] = useState('')
  const [catType, setCatType] = useState('gasto') // 'ingreso' o 'gasto'

  const [newCurrency, setNewCurrency] = useState('')

  // Estado de red real, no un texto fijo que siempre dice "sincronizado".
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  // La sincronización corre al montar cada pantalla de datos, así que "forzar"
  // es recargar: es lo que realmente vuelve a disparar PUSH + PULL.
  const handleForceSync = () => {
    setActionError(null)
    if (!navigator.onLine) {
      setActionError('Sin conexión. Tus cambios se suben solos cuando vuelva la señal.')
      return
    }
    setBusy(true)
    window.location.reload()
  }

  const handleClearLocalData = async () => {
    const confirmed = window.confirm(
      'Se borra la copia de ingresos, gastos y saldo guardada en este dispositivo.\n\n' +
      'Lo que ya se sincronizó se vuelve a descargar. Lo que esté pendiente de subir se pierde.\n\n' +
      '¿Borrar de todos modos?'
    )
    if (!confirmed) return

    setActionError(null)
    setBusy(true)
    try {
      await Promise.all(
        CACHE_STORES.map(storeName =>
          localforage.createInstance({ name: 'PolloAsado', storeName }).clear()
        )
      )
      window.location.reload()
    } catch (err) {
      console.error('No se pudo borrar la caché local:', err)
      setActionError('No se pudieron borrar los datos de este dispositivo. Intentá de nuevo.')
      setBusy(false)
    }
  }

  const handleAddCategory = (e) => {
    e.preventDefault()
    const name = newCat.trim()
    if (!name) return
    // Duplicados: comparación sin distinguir mayúsculas ni acentos de más.
    const exists = categories[catType].some(c => c.toLowerCase() === name.toLowerCase())
    if (exists) {
      setActionError(`"${name}" ya existe en ${catType === 'ingreso' ? 'ingresos' : 'gastos'}.`)
      return
    }
    setActionError(null)
    setCategories(prev => ({
      ...prev,
      [catType]: [...prev[catType], name]
    }))
    setNewCat('')
  }

  const handleRemoveCategory = (type, catToRemove) => {
    setCategories(prev => ({
      ...prev,
      [type]: prev[type].filter(c => c !== catToRemove)
    }))
  }

  const handleAddCurrency = (e) => {
    e.preventDefault()
    const code = newCurrency.trim().toUpperCase()
    if (!code) return
    // Un código inválido rompe el formateo de montos en toda la app.
    if (!/^[A-Z]{3}$/.test(code)) {
      setActionError('El código de divisa son 3 letras. Ejemplo: USD, EUR.')
      return
    }
    if (settings.divisas_activas.includes(code)) {
      setActionError(`${code} ya está en tu lista.`)
      return
    }
    setActionError(null)
    updateSettings({ divisas_activas: [...settings.divisas_activas, code] })
    setNewCurrency('')
  }

  const handleRemoveCurrency = (cur) => {
    if (cur === settings.divisa_principal) {
      setActionError('No podés eliminar tu divisa principal. Cambiala primero.')
      return
    }
    setActionError(null)
    updateSettings({ divisas_activas: settings.divisas_activas.filter(c => c !== cur) })
  }

  if (loading) return (
    <div className="w-full flex-1 flex items-center justify-center min-h-[50vh] text-text-secondary text-sm">
      Cargando ajustes…
    </div>
  )

  return (
    <div className="w-full flex-1 flex flex-col gap-8">

      {/* HEADER */}
      <h2 className="heading">Ajustes</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* COLUMNA IZQUIERDA: Cuenta y Sincronización */}
        <div className="flex flex-col gap-8">

          {/* PANEL DE CUENTA */}
          <div className="card flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">Cuenta</h3>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-text-secondary">Correo</span>
              <span className="user-text text-sm font-mono text-text-primary">{user?.email || 'Sin correo asociado'}</span>
            </div>
            <button
              onClick={onLogout}
              className="btn-danger mt-2"
            >
              Cerrar sesión
            </button>
          </div>

          {/* PANEL DE SINCRONIZACIÓN (LOCAL FIRST) */}
          <div className="card flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30 flex items-center gap-2">
              Sincronización
              <span className="bg-accent-app text-bg-app text-[10px] px-2 py-0.5 rounded-full font-bold">BETA</span>
            </h3>

            <p className="text-sm text-text-secondary leading-relaxed">
              Lo que anotás se guarda primero en este dispositivo y se sube a la nube en segundo plano. Podés registrar movimientos sin conexión.
            </p>

            <div className="flex items-center gap-3 bg-surface-app/50 rounded-xl border border-border-app/30 p-4">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-positive' : 'bg-warning'}`}></div>
              <span className="text-sm text-text-primary" aria-live="polite">
                {isOnline
                  ? 'En línea. Los cambios se suben en segundo plano.'
                  : 'Sin conexión. Todo queda guardado acá hasta que vuelva la señal.'}
              </span>
            </div>

            {actionError && (
              <p className="notice-warning" role="alert">{actionError}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button
                onClick={handleForceSync}
                disabled={busy}
                className="btn-secondary flex-1"
              >
                {busy ? 'Sincronizando…' : 'Volver a sincronizar'}
              </button>
              <button
                onClick={handleClearLocalData}
                disabled={busy}
                className="btn-danger flex-1"
              >
                Borrar datos de este dispositivo
              </button>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Preferencias y Categorías */}
        <div className="flex flex-col gap-8">

          {/* PANEL DE GESTIÓN DE CATEGORÍAS */}
          <div className="card flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">Categorías</h3>
            <p className="notice-warning" role="status">
              Vista previa: los cambios de esta lista todavía no llegan a los formularios de ingresos y gastos.
            </p>

            <form onSubmit={handleAddCategory} className="flex gap-2">
              <select
                value={catType}
                onChange={(e) => setCatType(e.target.value)}
                className="input w-auto cursor-pointer"
              >
                <option value="ingreso">Ingreso</option>
                <option value="gasto">Gasto</option>
              </select>
              <input
                type="text"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder="Nueva categoría"
                maxLength={40}
                className="input flex-1"
              />
              <button type="submit" className="btn-primary px-4 aspect-square" aria-label="Agregar categoría">+</button>
            </form>

            <div className="flex flex-col gap-6 mt-2">
              <div className="flex flex-col gap-3">
                <span className="text-sm font-semibold text-text-secondary">Ingresos</span>
                <div className="flex flex-wrap gap-2">
                  {categories.ingreso.map(cat => (
                    <span key={`ing-${cat}`} className="user-text bg-bg-app border border-border-app/50 text-sm px-3 py-1.5 rounded-full flex items-center gap-2 max-w-full">
                      {cat}
                      <button onClick={() => handleRemoveCategory('ingreso', cat)} aria-label={`Quitar ${cat}`} className="text-text-secondary hover:text-negative font-bold px-1 rounded-full">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-sm font-semibold text-text-secondary">Gastos</span>
                <div className="flex flex-wrap gap-2">
                  {categories.gasto.map(cat => (
                    <span key={`gas-${cat}`} className="user-text bg-bg-app border border-border-app/50 text-sm px-3 py-1.5 rounded-full flex items-center gap-2 max-w-full">
                      {cat}
                      <button onClick={() => handleRemoveCategory('gasto', cat)} aria-label={`Quitar ${cat}`} className="text-text-secondary hover:text-negative font-bold px-1 rounded-full">×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* PANEL DE GESTIÓN DE DIVISAS */}
          <div className="card flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">Divisas</h3>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-text-secondary">Divisa principal</label>
              <select
                value={settings.divisa_principal}
                onChange={(e) => updateSettings({ divisa_principal: e.target.value })}
                className="input cursor-pointer"
              >
                {settings.divisas_activas.map(cur => (
                  <option key={cur} value={cur}>{cur}</option>
                ))}
              </select>
              <p className="text-xs text-text-secondary">Los saldos y totales se muestran en esta divisa.</p>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <label className="text-sm font-semibold text-text-secondary">Otras divisas</label>
              <form onSubmit={handleAddCurrency} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value.toUpperCase())}
                  placeholder="Ej. USD"
                  maxLength="3"
                  className="input flex-1 uppercase"
                />
                <button type="submit" className="btn-primary px-4 aspect-square" aria-label="Agregar divisa">+</button>
              </form>
              <div className="flex flex-wrap gap-2">
                {settings.divisas_activas.map(cur => (
                  <span key={cur} className="bg-bg-app border border-border-app/50 text-sm px-3 py-1.5 rounded-full flex items-center gap-2 font-mono">
                    {cur}
                    {cur !== settings.divisa_principal && (
                      <button onClick={() => handleRemoveCurrency(cur)} aria-label={`Quitar ${cur}`} className="text-text-secondary hover:text-negative font-bold px-1 rounded-full">×</button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* PANEL DE BALDES 50/30/20 */}
          <div className="card flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">Baldes 50/30/20</h3>
            <p className="text-sm text-text-secondary">Decidí en qué balde cae cada categoría de gasto y qué porcentaje del ingreso le toca a cada balde.</p>

            {prefsSyncError && <p className="notice-warning" role="status">{prefsSyncError}</p>}
            {baldesError && <p className="notice-negative" role="alert">{baldesError}</p>}

            {loadingPrefs ? (
              <div className="skeleton h-32 w-full" />
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {CATEGORIAS_GASTO.map(cat => (
                    <div key={cat} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-text-primary">{cat}</span>
                      <select
                        value={categoriaBaldes[cat] || 'gusto'}
                        onChange={(e) => handleBaldeChange(cat, e.target.value)}
                        className="input w-auto cursor-pointer"
                      >
                        <option value="necesidad">Necesidad</option>
                        <option value="gusto">Gusto</option>
                        <option value="ahorro">Ahorro</option>
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4 border-t border-border-app/20">
                  {['necesidad', 'gusto', 'ahorro'].map(balde => (
                    <div key={balde} className="flex flex-col gap-1 flex-1">
                      <label className="text-xs font-semibold text-text-secondary capitalize">{balde}</label>
                      <input
                        type="number"
                        value={porcentajesBalde[balde] ?? 0}
                        onChange={(e) => handlePorcentajeChange(balde, e.target.value)}
                        min="0"
                        max="100"
                        className="input font-mono"
                      />
                    </div>
                  ))}
                </div>

                <button type="button" onClick={handleGuardarBaldes} className="btn-primary mt-2">Guardar baldes</button>
              </>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
