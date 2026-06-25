import { useState, useEffect } from 'react'
import { useIncomes } from '../../hooks/useIncomes'
import { useSettings } from '../../hooks/useSettings'

export default function IncomeForm({ user, setView, initialData, onCancel }) {
  const { settings, getCachedRate, setCachedRate } = useSettings()
  const baseCurrency = settings?.divisa_principal || 'CRC'

  const [isExtended, setIsExtended] = useState(false)
  const [useDesglose, setUseDesglose] = useState(false)

  const [isCustomizingDates, setIsCustomizingDates] = useState(false)
  const [projectedDates, setProjectedDates] = useState([])

  const { addIncome, updateIncome } = useIncomes(user)

  const [updateMode, setUpdateMode] = useState('single') // 'single' | 'series'
  const isEditing = !!initialData
  const hasGroup = !!initialData?.grupo_recurrencia

  const [formData, setFormData] = useState({
    amount: initialData?.amount || '',
    concept: initialData?.concept || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    category: initialData?.category || '',
    account: initialData?.account || '',
    notes: initialData?.notes || '',
    desglose: initialData?.desglose || [],
    es_recurrente: initialData?.es_recurrente || false,
    frecuencia: initialData?.frecuencia || 'mensual',
    limite_recurrencia: initialData?.limite_recurrencia || '',
    divisa_original: initialData?.divisa_original || 'CRC',
    tasa_cambio: initialData?.tasa_cambio || ''
  })

  // Disable Desglose toggle if editing and has desglose already (to keep it simple, it's just open)
  useEffect(() => {
    if (initialData && initialData.desglose && initialData.desglose.length > 0) {
      setUseDesglose(true)
      setIsExtended(true)
    }
    if (initialData && (initialData.category || initialData.account || initialData.notes)) {
      setIsExtended(true)
    }
  }, [initialData])

  useEffect(() => {
    if (settings?.divisa_principal && formData.divisa_original === 'CRC') {
      setFormData(prev => ({ ...prev, divisa_original: settings.divisa_principal }))
    }
  }, [settings?.divisa_principal])

  useEffect(() => {
    // Si estamos editando, no recalculamos proyecciones al cambiar base
    if (isEditing) return;

    if (!formData.es_recurrente || !formData.date) {
      setProjectedDates([])
      return
    }
    const dates = []
    let current = new Date(formData.date + 'T12:00:00') // Evita timezone offset issues
    const count = formData.limite_recurrencia ? parseInt(formData.limite_recurrencia, 10) : 5
    const limitSafeguard = Math.min(count || 5, 120) // Seguridad

    for (let i = 0; i < limitSafeguard; i++) {
      dates.push(current.toISOString().split('T')[0])
      if (formData.frecuencia === 'semanal') current.setDate(current.getDate() + 7)
      else if (formData.frecuencia === 'quincenal') current.setDate(current.getDate() + 15)
      else if (formData.frecuencia === 'mensual') current.setMonth(current.getMonth() + 1)
    }
    setProjectedDates(dates)
    // Apagamos modo custom si el usuario cambia las reglas base
    setIsCustomizingDates(false)
  }, [formData.es_recurrente, formData.date, formData.frecuencia, formData.limite_recurrencia])

  const handleCustomDateChange = (index, value) => {
    const newDates = [...projectedDates]
    newDates[index] = value
    setProjectedDates(newDates)
  }

  const [isFetchingRate, setIsFetchingRate] = useState(false)
  const [rateError, setRateError] = useState('')

  const [newDesgloseItem, setNewDesgloseItem] = useState({
    descripcion: '',
    monto: '',
    operacion: 'suma' // 'suma' o 'resta'
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    // Si cambia la fecha o la moneda y son distintas a la base, intentar obtener tasa
    if (name === 'divisa_original' || name === 'date') {
      const newDivisa = name === 'divisa_original' ? value : formData.divisa_original
      const newDate = name === 'date' ? value : formData.date

      setFormData((prev) => ({ ...prev, [name]: value }))

      if (newDivisa !== baseCurrency && newDate) {
        fetchExchangeRate(newDivisa, baseCurrency, newDate)
      } else if (newDivisa === baseCurrency) {
        setFormData((prev) => ({ ...prev, tasa_cambio: '' }))
        setRateError('')
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    }
  }

  const fetchExchangeRate = async (from, to, date) => {
    if (!navigator.onLine) {
      const cached = getCachedRate(from, to)
      if (cached) {
        setFormData((prev) => ({ ...prev, tasa_cambio: cached.toString() }))
        setRateError('Modo sin conexión: Usando última tasa conocida.')
      } else {
        setFormData((prev) => ({ ...prev, tasa_cambio: '' }))
        setRateError('Sin conexión. La tasa se calculará al sincronizar.')
      }
      return
    }

    setIsFetchingRate(true)
    setRateError('')

    try {
      const fromLower = from.toLowerCase()
      const toLower = to.toLowerCase()

      const today = new Date().toISOString().split('T')[0]
      const endpoint = date === today || new Date(date) >= new Date() ? 'latest' : date

      const res = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${endpoint}/v1/currencies/${fromLower}.json`)

      if (!res.ok) throw new Error('Error al consultar tasa')

      const data = await res.json()
      if (data && data[fromLower] && data[fromLower][toLower]) {
        const rate = data[fromLower][toLower]
        setFormData((prev) => ({ ...prev, tasa_cambio: rate.toString() }))
        setCachedRate(from, to, rate) // Cachear para offline
      }
    } catch (err) {
      console.error(err)
      const cached = getCachedRate(from, to)
      if (cached) {
        setFormData((prev) => ({ ...prev, tasa_cambio: cached.toString() }))
        setRateError('Fallo de red. Usando tasa cacheada.')
      } else {
        setFormData((prev) => ({ ...prev, tasa_cambio: '' }))
        setRateError('Error al obtener la tasa. Se calculará después.')
      }
    } finally {
      setIsFetchingRate(false)
    }
  }

  const handleDesgloseChange = (e) => {
    const { name, value } = e.target
    setNewDesgloseItem((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddDesglose = () => {
    if (!newDesgloseItem.descripcion || !newDesgloseItem.monto) return
    const item = { ...newDesgloseItem, id: Date.now() }
    const updatedDesglose = [...formData.desglose, item]

    const total = updatedDesglose.reduce((acc, curr) => {
      const val = parseFloat(curr.monto)
      return curr.operacion === 'suma' ? acc + val : acc - val
    }, 0)

    setFormData({ ...formData, desglose: updatedDesglose, amount: total > 0 ? total.toFixed(2) : '0.00' })
    setNewDesgloseItem({ descripcion: '', monto: '', operacion: 'suma' })
  }

  const handleRemoveDesglose = (id) => {
    const updatedDesglose = formData.desglose.filter(i => i.id !== id)

    const total = updatedDesglose.reduce((acc, curr) => {
      const val = parseFloat(curr.monto)
      return curr.operacion === 'suma' ? acc + val : acc - val
    }, 0)

    setFormData({ ...formData, desglose: updatedDesglose, amount: total > 0 ? total.toFixed(2) : '0.00' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const finalData = {
      ...formData,
      fechas_proyectadas: projectedDates
    }

    if (isEditing) {
      await updateIncome(initialData.id, finalData, updateMode)
    } else {
      await addIncome(finalData)
    }

    // After submit, return to list view
    if (onCancel) onCancel()
    else setView('list')
  }

  return (
    <div className="w-full flex-1 flex flex-col gap-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-accent-app/20 pb-4">
        <div className="flex flex-col gap-1 border-l-2 border-accent-app pl-4">
          <h2 className="text-2xl md:text-3xl font-bold text-accent-app tracking-wide uppercase leading-none">
            {isEditing ? 'Editar Ingreso' : 'Registrar Ingreso'}
          </h2>
          <p className="text-xs md:text-sm text-text-secondary">
            {isEditing ? 'Modifica los detalles de esta entrada.' : 'Añade una nueva entrada financiera al sistema.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel || (() => setView('list'))}
          className="text-xs font-bold text-text-secondary hover:text-text-primary px-6 py-2 border border-border-app hover:border-accent-app transition-colors uppercase tracking-wider"
        >
          ← Volver a la Lista
        </button>
      </div>

      <div className="w-full max-w-4xl mx-auto bg-surface-app/5 border border-border-app p-6 md:p-8">

        {isEditing && hasGroup && (
          <div className="mb-6 bg-surface-app/20 border border-accent-app/50 p-4 flex flex-col gap-3">
            <span className="text-xs font-bold text-accent-app uppercase tracking-wider">Opciones de Edición de Serie</span>
            <p className="text-[10px] text-text-secondary">Este ingreso pertenece a una serie recurrente. ¿Qué deseas editar?</p>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-text-primary font-bold">
                <input type="radio" name="updateMode" value="single" checked={updateMode === 'single'} onChange={() => setUpdateMode('single')} className="accent-accent-app w-4 h-4" />
                Solo esta instancia
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-text-primary font-bold">
                <input type="radio" name="updateMode" value="series" checked={updateMode === 'series'} onChange={() => setUpdateMode('series')} className="accent-accent-app w-4 h-4" />
                Toda la serie (Futura e Histórica)
              </label>
            </div>
            {updateMode === 'series' && (
              <p className="text-[9px] text-amber-400 italic">Nota: Al editar toda la serie, se actualizará el concepto, monto y categoría para todas las instancias asociadas. Las fechas y la frecuencia no serán modificadas.</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2 md:col-span-2">
              <label htmlFor="concept" className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Concepto *</label>
              <input
                type="text"
                id="concept"
                name="concept"
                value={formData.concept}
                onChange={handleChange}
                placeholder="Ej. Salario quincenal, Venta de equipo..."
                required
                className="w-full bg-surface-app/50 border border-border-app p-3 text-sm text-text-primary focus:outline-none focus:border-accent-app transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="amount" className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Monto {formData.divisa_original !== baseCurrency ? '(Moneda Original)' : ''}</label>
              <div className="relative flex">
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                  disabled={useDesglose}
                  className={`w-full bg-surface-app/50 border border-border-app p-3 pl-4 pr-20 text-sm font-mono font-bold text-text-primary focus:outline-none focus:border-accent-app transition-colors ${useDesglose ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <select
                  name="divisa_original"
                  value={formData.divisa_original}
                  onChange={handleChange}
                  className="absolute right-0 top-0 bottom-0 bg-transparent border-l border-border-app text-xs font-bold text-text-secondary px-2 focus:outline-none focus:text-accent-app cursor-pointer uppercase"
                >
                  {settings?.divisas_activas?.map(cur => (
                    <option key={cur} value={cur}>{cur}</option>
                  ))}
                </select>
              </div>

              {formData.divisa_original !== baseCurrency && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] font-mono mt-1 gap-1">
                  <div className="flex items-center gap-2">
                    <span className={rateError ? 'text-amber-400' : 'text-text-secondary'}>
                      {isFetchingRate
                        ? 'Calculando tasa...'
                        : formData.tasa_cambio
                          ? `1 ${formData.divisa_original} = ${formData.tasa_cambio} ${baseCurrency}`
                          : rateError || 'Auto-cálculo pendiente'}
                    </span>
                    {!formData.tasa_cambio && !isFetchingRate && (
                      <button
                        type="button"
                        onClick={() => fetchExchangeRate(formData.divisa_original, baseCurrency, formData.date)}
                        className="text-accent-app hover:underline"
                      >
                        Reintentar
                      </button>
                    )}
                  </div>
                  {formData.amount && formData.tasa_cambio && (
                    <span className="text-emerald-400 font-bold">
                      Total: {(parseFloat(formData.amount) * parseFloat(formData.tasa_cambio)).toFixed(2)} {baseCurrency}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="date" className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Fecha *</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full bg-surface-app/50 border border-border-app p-3 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-app transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => setIsExtended(!isExtended)}
              className="text-xs font-semibold text-accent-app hover:text-text-primary transition-colors cursor-pointer flex items-center gap-2 select-none uppercase tracking-wider"
            >
              <span className={`transform transition-transform duration-300 ${isExtended ? 'rotate-180' : ''}`}>
                ▼
              </span>
              {isExtended ? 'Ocultar opciones avanzadas' : 'Mostrar opciones avanzadas'}
            </button>
          </div>

          <div className={`flex flex-col gap-8 transition-all duration-500 overflow-hidden ${isExtended ? 'opacity-100 h-auto' : 'opacity-0 h-0'}`}>

            <div className="flex flex-col gap-4 border border-dashed border-accent-app/40 p-5 bg-surface-app/10 rounded-sm">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-text-primary uppercase tracking-wider">Desglose de Monto (Cuentas Divididas)</span>
                  <span className="text-[10px] text-text-secondary mt-1">Especifica sub-transacciones. El monto total se calculará automáticamente.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={useDesglose} onChange={() => setUseDesglose(!useDesglose)} />
                  <div className="w-9 h-5 bg-surface-app/80 peer-focus:outline-none border border-border-app rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-secondary peer-checked:after:bg-bg-app after:border-border-app after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-app"></div>
                </label>
              </div>

              {useDesglose && (
                <div className="flex flex-col gap-4 mt-2 animate-in fade-in duration-300">
                  {formData.desglose.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {formData.desglose.map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-surface-app/40 p-2.5 border border-border-app text-sm">
                          <span className="text-text-primary text-xs truncate max-w-[50%]">{item.descripcion}</span>
                          <div className="flex items-center gap-3">
                            <span className={`font-mono text-xs font-bold ${item.operacion === 'suma' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {item.operacion === 'suma' ? '+' : '-'}${parseFloat(item.monto).toFixed(2)}
                            </span>
                            <button type="button" onClick={() => handleRemoveDesglose(item.id)} className="text-text-secondary hover:text-rose-400 font-bold px-1 cursor-pointer">×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    <input
                      type="text"
                      name="descripcion"
                      placeholder="Descripción (Ej. Transferencia Juan)"
                      value={newDesgloseItem.descripcion}
                      onChange={handleDesgloseChange}
                      className="w-full sm:flex-1 bg-bg-app border border-border-app p-2 text-xs text-text-primary focus:outline-none focus:border-accent-app"
                    />
                    <div className="flex gap-2 w-full sm:w-auto">
                      <select
                        name="operacion"
                        value={newDesgloseItem.operacion}
                        onChange={handleDesgloseChange}
                        className="bg-bg-app border border-border-app p-2 text-xs text-text-primary focus:outline-none focus:border-accent-app appearance-none text-center cursor-pointer"
                      >
                        <option value="suma">+</option>
                        <option value="resta">-</option>
                      </select>
                      <input
                        type="number"
                        name="monto"
                        placeholder="0.00"
                        step="0.01"
                        value={newDesgloseItem.monto}
                        onChange={handleDesgloseChange}
                        className="w-24 bg-bg-app border border-border-app p-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-app"
                      />
                      <button
                        type="button"
                        onClick={handleAddDesglose}
                        className="bg-surface-app border border-border-app hover:border-accent-app text-text-primary px-3 py-2 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Añadir
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="category" className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Categoría</label>
                <div className="relative">
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full bg-surface-app/50 border border-border-app p-3 text-sm text-text-primary focus:outline-none focus:border-accent-app transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">Seleccionar categoría...</option>
                    <option value="salary">Salario</option>
                    <option value="business">Negocio</option>
                    <option value="freelance">Freelance</option>
                    <option value="investments">Inversiones</option>
                    <option value="gifts">Regalos</option>
                    <option value="other">Otros</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-text-secondary">▼</div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="account" className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Cuenta Destino</label>
                <div className="relative">
                  <select
                    id="account"
                    name="account"
                    value={formData.account}
                    onChange={handleChange}
                    className="w-full bg-surface-app/50 border border-border-app p-3 text-sm text-text-primary focus:outline-none focus:border-accent-app transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">Seleccionar cuenta...</option>
                    <option value="cash">Efectivo</option>
                    <option value="bank_main">Cuenta Principal</option>
                    <option value="savings">Ahorros</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-text-secondary">▼</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="notes" className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Notas Adicionales</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Detalles sobre este ingreso..."
                rows="2"
                className="w-full bg-surface-app/50 border border-border-app p-3 text-sm text-text-primary focus:outline-none focus:border-accent-app transition-colors resize-y"
              ></textarea>
            </div>

            {(!isEditing || (isEditing && hasGroup && updateMode === 'series')) && (
              <div className="flex flex-col gap-4 border-t border-border-app pt-6 mt-2">
                {isEditing ? (
                  <p className="text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 p-3">
                    Nota: Al editar una serie existente, los parámetros de fechas y frecuencia están bloqueados por seguridad. Para cambiar la frecuencia, elimina la serie desde la base de datos y crea una nueva.
                  </p>
                ) : (
                  <>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative inline-flex items-center">
                        <input type="checkbox" name="es_recurrente" className="sr-only peer" checked={formData.es_recurrente} onChange={handleChange} />
                        <div className="w-9 h-5 bg-surface-app/80 peer-focus:outline-none border border-border-app rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-secondary peer-checked:after:bg-bg-app after:border-border-app after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-app"></div>
                      </div>
                      <span className="text-sm font-bold text-text-primary uppercase tracking-wider">Es un ingreso recurrente</span>
                    </label>

                    {formData.es_recurrente && (
                      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Frecuencia</label>
                            <select name="frecuencia" value={formData.frecuencia} onChange={handleChange} className="w-full bg-surface-app/50 border border-border-app p-3 text-sm text-text-primary focus:outline-none focus:border-accent-app">
                              <option value="semanal">Semanal</option>
                              <option value="quincenal">Quincenal</option>
                              <option value="mensual">Mensual</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Duración Límite (Opcional)</label>
                            <div className="relative">
                              <input
                                type="number"
                                id="limite_recurrencia"
                                name="limite_recurrencia"
                                value={formData.limite_recurrencia}
                                onChange={handleChange}
                                placeholder="Ej. 12"
                                min="1"
                                className="w-full bg-surface-app/50 border border-border-app p-3 pr-16 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-app transition-colors"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-text-secondary uppercase tracking-widest pointer-events-none">
                                {formData.frecuencia === 'semanal' ? 'Semanas' : formData.frecuencia === 'quincenal' ? 'Quincenas' : 'Meses'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {projectedDates.length > 0 && (
                          <div className="bg-surface-app/30 border border-border-app p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-center border-b border-border-app pb-2">
                              <h4 className="text-[10px] font-bold text-accent-app uppercase tracking-wider">
                                {formData.limite_recurrencia ? 'Fechas de Ejecución' : 'Próximas 5 Fechas (Vista Previa)'}
                              </h4>
                              {formData.limite_recurrencia && (
                                <button
                                  type="button"
                                  onClick={() => setIsCustomizingDates(!isCustomizingDates)}
                                  className={`text-[9px] px-2 py-1 border ${isCustomizingDates ? 'bg-accent-app text-bg-app border-accent-app' : 'border-border-app text-text-secondary hover:text-text-primary'}`}
                                >
                                  {isCustomizingDates ? 'Desactivar Edición' : 'Personalizar Fechas'}
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {projectedDates.map((d, i) => (
                                <div key={i} className="flex flex-col gap-1">
                                  <span className="text-[9px] text-text-secondary">#{i + 1}</span>
                                  {isCustomizingDates ? (
                                    <input
                                      type="date"
                                      value={d}
                                      onChange={(e) => handleCustomDateChange(i, e.target.value)}
                                      className="bg-bg-app border border-border-app p-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-app w-full"
                                    />
                                  ) : (
                                    <span className="text-xs font-mono bg-surface-app/50 border border-border-app p-1.5 text-text-primary text-center">
                                      {d}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>

                            {!formData.limite_recurrencia && (
                              <p className="text-[9px] text-text-secondary italic">Como no hay límite, la serie será tratada como una plantilla continua.</p>
                            )}
                            {formData.limite_recurrencia && (
                              <p className="text-[9px] text-emerald-400 font-mono mt-1">
                                Total proyectado a generar: {(parseFloat(formData.amount || 0) * (formData.tasa_cambio ? parseFloat(formData.tasa_cambio) : 1) * parseInt(formData.limite_recurrencia)).toFixed(2)} {baseCurrency}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-border-app flex flex-col sm:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={onCancel || (() => setView('list'))}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-text-secondary hover:text-text-primary border border-transparent hover:border-border-app transition-colors cursor-pointer uppercase tracking-wider"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto bg-accent-app text-bg-app font-bold text-sm px-8 py-3 hover:opacity-90 transition-opacity active:scale-[0.98] cursor-pointer uppercase tracking-wider"
            >
              {isEditing ? 'Guardar Cambios' : 'Guardar Ingreso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
