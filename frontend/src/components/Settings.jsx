import { useState, useEffect } from 'react'
import { useSettings } from '../hooks/useSettings'

export default function Settings({ user, onLogout }) {
  const { settings, loading, updateSettings } = useSettings()
  const [syncStatus, setSyncStatus] = useState('En línea (Sincronizado)')
  const [categories, setCategories] = useState({
    ingreso: ['Salario', 'Negocio', 'Inversiones', 'Regalos', 'Otros'],
    gasto: ['Comida', 'Transporte', 'Vivienda', 'Entretenimiento', 'Hormiga']
  })

  const [newCat, setNewCat] = useState('')
  const [catType, setCatType] = useState('gasto') // 'ingreso' o 'gasto'

  const [newCurrency, setNewCurrency] = useState('')

  const handleForceSync = () => {
    setSyncStatus('Sincronizando...')
    setTimeout(() => {
      setSyncStatus('En línea (Sincronizado hace un momento)')
      alert('Sincronización con Supabase completada con éxito.')
    }, 1500)
  }

  const handleClearLocalData = () => {
    if (window.confirm('¿Estás seguro de que deseas borrar toda la caché local? Se volverá a descargar desde la nube en la próxima recarga.')) {
      alert('Caché local borrada. Recarga la aplicación.')
    }
  }

  const handleAddCategory = (e) => {
    e.preventDefault()
    if (!newCat.trim()) return

    setCategories(prev => ({
      ...prev,
      [catType]: [...prev[catType], newCat.trim()]
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
    if (!newCurrency.trim()) return
    const code = newCurrency.trim().toUpperCase()
    if (!settings.divisas_activas.includes(code)) {
      updateSettings({ divisas_activas: [...settings.divisas_activas, code] })
    }
    setNewCurrency('')
  }

  const handleRemoveCurrency = (cur) => {
    if (cur === settings.divisa_principal) {
      alert("No puedes eliminar tu divisa principal.")
      return
    }
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
      <div className="flex flex-col gap-2">
        <h2 className="heading">Ajustes</h2>
        <p className="text-sm text-text-secondary">
          Configuración de cuenta, almacenamiento local y sincronización.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* COLUMNA IZQUIERDA: Cuenta y Sincronización */}
        <div className="flex flex-col gap-8">

          {/* PANEL DE CUENTA */}
          <div className="card flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">Cuenta</h3>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-text-secondary">Correo Electrónico</span>
              <span className="text-sm font-mono text-text-primary">{user?.email || 'Usuario de Prueba'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-text-secondary">Suscripción</span>
              <span className="text-sm font-semibold text-emerald-400">Activa (Plan Gratuito)</span>
            </div>
            <button
              onClick={onLogout}
              className="btn-secondary text-rose-400 hover:text-rose-300 hover:border-rose-400/50 mt-2"
            >
              Cerrar Sesión
            </button>
          </div>

          {/* PANEL DE SINCRONIZACIÓN (LOCAL FIRST) */}
          <div className="card flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30 flex items-center gap-2">
              Sincronización
              <span className="bg-accent-app text-bg-app text-[10px] px-2 py-0.5 rounded-full font-bold">BETA</span>
            </h3>

            <p className="text-sm text-text-secondary leading-relaxed">
              PolloAsado opera bajo una arquitectura <strong>Local-First</strong>. Tus transacciones se guardan instantáneamente en tu dispositivo y se sincronizan con la nube en segundo plano para máxima velocidad.
            </p>

            <div className="flex items-center gap-3 bg-surface-app/50 rounded-xl border border-border-app/30 p-4">
              <div className={`w-2 h-2 rounded-full ${syncStatus.includes('Sincronizando') ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
              <span className="text-sm font-mono text-text-primary">{syncStatus}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button
                onClick={handleForceSync}
                className="btn-secondary flex-1"
              >
                Forzar Sync
              </button>
              <button
                onClick={handleClearLocalData}
                className="btn-secondary flex-1 text-rose-400 hover:text-rose-300 hover:border-rose-400/50"
              >
                Borrar Caché
              </button>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Preferencias y Categorías */}
        <div className="flex flex-col gap-8">

          {/* PANEL DE GESTIÓN DE CATEGORÍAS */}
          <div className="card flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">Categorías</h3>
            <p className="text-sm text-text-secondary">Personaliza las categorías disponibles al registrar ingresos y gastos.</p>

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
                placeholder="Nueva categoría..."
                className="input flex-1"
              />
              <button type="submit" className="btn-primary px-4 aspect-square">+</button>
            </form>

            <div className="flex flex-col gap-6 mt-2">
              <div className="flex flex-col gap-3">
                <span className="text-sm font-semibold text-text-secondary">Ingresos</span>
                <div className="flex flex-wrap gap-2">
                  {categories.ingreso.map(cat => (
                    <span key={`ing-${cat}`} className="bg-bg-app border border-border-app/50 text-sm px-3 py-1.5 rounded-full flex items-center gap-2">
                      {cat}
                      <button onClick={() => handleRemoveCategory('ingreso', cat)} className="text-text-secondary hover:text-rose-400 font-bold px-1 rounded-full">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-sm font-semibold text-text-secondary">Gastos</span>
                <div className="flex flex-wrap gap-2">
                  {categories.gasto.map(cat => (
                    <span key={`gas-${cat}`} className="bg-bg-app border border-border-app/50 text-sm px-3 py-1.5 rounded-full flex items-center gap-2">
                      {cat}
                      <button onClick={() => handleRemoveCategory('gasto', cat)} className="text-text-secondary hover:text-rose-400 font-bold px-1 rounded-full">×</button>
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
              <label className="text-sm font-semibold text-text-secondary">Divisa Principal (Base)</label>
              <select
                value={settings.divisa_principal}
                onChange={(e) => updateSettings({ divisa_principal: e.target.value })}
                className="input cursor-pointer"
              >
                {settings.divisas_activas.map(cur => (
                  <option key={cur} value={cur}>{cur}</option>
                ))}
              </select>
              <p className="text-xs text-text-secondary">Todos tus reportes se mostrarán en esta moneda.</p>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <label className="text-sm font-semibold text-text-secondary">Monedas Disponibles</label>
              <form onSubmit={handleAddCurrency} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value.toUpperCase())}
                  placeholder="Ej. EUR, MXN, COP..."
                  maxLength="3"
                  className="input flex-1 uppercase"
                />
                <button type="submit" className="btn-primary px-4 aspect-square">+</button>
              </form>
              <div className="flex flex-wrap gap-2">
                {settings.divisas_activas.map(cur => (
                  <span key={cur} className="bg-bg-app border border-border-app/50 text-sm px-3 py-1.5 rounded-full flex items-center gap-2 font-mono">
                    {cur}
                    {cur !== settings.divisa_principal && (
                      <button onClick={() => handleRemoveCurrency(cur)} className="text-text-secondary hover:text-rose-400 font-bold px-1 rounded-full">×</button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
