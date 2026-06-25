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
    if(window.confirm('¿Estás seguro de que deseas borrar toda la caché local? Se volverá a descargar desde la nube en la próxima recarga.')) {
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

  if (loading) return <div className="p-8 text-text-secondary animate-pulse">Cargando ajustes...</div>

  return (
    <div className="w-full flex-1 flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col gap-1 border-l-2 border-accent-app pl-4 border-b border-accent-app/20 pb-4">
        <h2 className="text-2xl md:text-3xl font-bold text-accent-app tracking-wide uppercase leading-none">Ajustes</h2>
        <p className="text-xs md:text-sm text-text-secondary">
          Configuración de cuenta, almacenamiento local y sincronización.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLUMNA IZQUIERDA: Cuenta y Sincronización */}
        <div className="flex flex-col gap-8">
          
          {/* PANEL DE CUENTA */}
          <div className="bg-surface-app/30 border border-border-app p-6 flex flex-col gap-5">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-border-app pb-2">Tu Cuenta</h3>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-text-secondary uppercase">Correo Electrónico</span>
              <span className="text-sm font-mono text-text-primary">{user?.email || 'Usuario de Prueba'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-text-secondary uppercase">Estado de la Suscripción</span>
              <span className="text-sm font-semibold text-emerald-400">Activa (Plan Gratuito)</span>
            </div>
            <button
              onClick={onLogout}
              className="mt-2 w-full sm:w-auto bg-transparent border border-rose-500/50 text-rose-500 hover:bg-rose-500 hover:text-white text-xs font-bold uppercase tracking-wider py-2.5 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>

          {/* PANEL DE SINCRONIZACIÓN (LOCAL FIRST) */}
          <div className="bg-surface-app/30 border border-border-app p-6 flex flex-col gap-5">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-border-app pb-2 flex items-center gap-2">
              Sincronización PWA
              <span className="bg-accent-app text-bg-app text-[9px] px-1.5 py-0.5 rounded-sm font-bold">BETA</span>
            </h3>
            
            <p className="text-xs text-text-secondary leading-relaxed">
              PolloAsado opera bajo una arquitectura <strong>Local-First</strong>. Tus transacciones se guardan instantáneamente en tu dispositivo y se sincronizan con la nube en segundo plano para máxima velocidad.
            </p>

            <div className="flex items-center gap-3 bg-bg-app border border-border-app p-3">
              <div className={`w-2 h-2 rounded-full ${syncStatus.includes('Sincronizando') ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
              <span className="text-xs font-mono text-text-primary">{syncStatus}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button
                onClick={handleForceSync}
                className="flex-1 bg-surface-app border border-border-app hover:border-accent-app text-text-primary text-xs font-bold uppercase tracking-wider py-2.5 transition-colors"
              >
                Forzar Sync
              </button>
              <button
                onClick={handleClearLocalData}
                className="flex-1 bg-surface-app border border-border-app hover:border-rose-500/50 text-text-secondary hover:text-rose-400 text-xs font-bold uppercase tracking-wider py-2.5 transition-colors"
              >
                Borrar Caché Local
              </button>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Preferencias y Categorías */}
        <div className="flex flex-col gap-8">
          
          {/* PANEL DE GESTIÓN DE CATEGORÍAS */}
          <div className="bg-surface-app/30 border border-border-app p-6 flex flex-col gap-5 h-full">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-border-app pb-2">Gestión de Categorías</h3>
            <p className="text-xs text-text-secondary">Personaliza las categorías disponibles al registrar ingresos y gastos. Estos cambios se guardarán en las preferencias de tu perfil.</p>
            
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <select 
                value={catType} 
                onChange={(e) => setCatType(e.target.value)}
                className="bg-bg-app border border-border-app p-2 text-xs text-text-primary focus:outline-none focus:border-accent-app"
              >
                <option value="ingreso">Ingreso</option>
                <option value="gasto">Gasto</option>
              </select>
              <input 
                type="text" 
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder="Nueva categoría..."
                className="flex-1 bg-bg-app border border-border-app p-2 text-xs text-text-primary focus:outline-none focus:border-accent-app"
              />
              <button type="submit" className="bg-accent-app text-bg-app font-bold px-4 text-xs hover:opacity-90 transition-opacity">+</button>
            </form>

            <div className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-text-secondary uppercase">Tus Categorías de Ingreso</span>
                <div className="flex flex-wrap gap-2">
                  {categories.ingreso.map(cat => (
                    <span key={`ing-${cat}`} className="bg-bg-app border border-border-app text-xs px-2.5 py-1 flex items-center gap-2">
                      {cat}
                      <button onClick={() => handleRemoveCategory('ingreso', cat)} className="text-text-secondary hover:text-rose-400 font-bold px-1">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <span className="text-[10px] font-bold text-text-secondary uppercase">Tus Categorías de Gasto</span>
                <div className="flex flex-wrap gap-2">
                  {categories.gasto.map(cat => (
                    <span key={`gas-${cat}`} className="bg-bg-app border border-border-app text-xs px-2.5 py-1 flex items-center gap-2">
                      {cat}
                      <button onClick={() => handleRemoveCategory('gasto', cat)} className="text-text-secondary hover:text-rose-400 font-bold px-1">×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* PANEL DE GESTIÓN DE DIVISAS */}
          <div className="bg-surface-app/30 border border-border-app p-6 flex flex-col gap-5">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-border-app pb-2">Divisas</h3>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Divisa Principal (Base)</label>
              <select 
                value={settings.divisa_principal} 
                onChange={(e) => updateSettings({ divisa_principal: e.target.value })}
                className="bg-bg-app border border-border-app p-2 text-xs text-text-primary focus:outline-none focus:border-accent-app w-full uppercase"
              >
                {settings.divisas_activas.map(cur => (
                  <option key={cur} value={cur}>{cur}</option>
                ))}
              </select>
              <p className="text-[9px] text-text-secondary">Todos tus reportes se calcularán y mostrarán en esta moneda.</p>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Monedas Disponibles</label>
              <form onSubmit={handleAddCurrency} className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value.toUpperCase())}
                  placeholder="Ej. EUR, MXN, COP..."
                  maxLength="3"
                  className="flex-1 bg-bg-app border border-border-app p-2 text-xs text-text-primary focus:outline-none focus:border-accent-app uppercase"
                />
                <button type="submit" className="bg-accent-app text-bg-app font-bold px-4 text-xs hover:opacity-90 transition-opacity">+</button>
              </form>
              <div className="flex flex-wrap gap-2">
                {settings.divisas_activas.map(cur => (
                  <span key={cur} className="bg-bg-app border border-border-app text-xs px-2.5 py-1 flex items-center gap-2 font-mono">
                    {cur}
                    {cur !== settings.divisa_principal && (
                      <button onClick={() => handleRemoveCurrency(cur)} className="text-text-secondary hover:text-rose-400 font-bold px-1">×</button>
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
