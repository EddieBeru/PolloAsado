import { useState, useEffect } from 'react'
import { useIncomes } from '../../hooks/useIncomes'
import { useSettings } from '../../hooks/useSettings'
import { ArrowLeft, ChevronDown } from 'lucide-react'

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
    <div className="w-full flex-1 flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="heading">
            {isEditing ? 'Editar Ingreso' : 'Registrar Ingreso'}
          </h2>
          <p className="text-sm text-text-secondary">
            {isEditing ? 'Modifica los detalles de esta entrada.' : 'Añade una nueva entrada financiera al sistema.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel || (() => setView('list'))}
          className="btn-secondary"
        >
          <ArrowLeft size={18} /> Volver
        </button>
      </div>

      {isEditing && hasGroup && (
        <div className="card bg-amber-400/5 border-amber-400/30 flex flex-col gap-3">
          <span className="text-sm font-bold text-amber-400">Edición de Serie Recurrente</span>
          <p className="text-sm text-text-secondary">Este ingreso pertenece a una serie recurrente. ¿Qué deseas editar?</p>
          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-text-primary font-semibold">
              <input type="radio" name="updateMode" value="single" checked={updateMode === 'single'} onChange={() => setUpdateMode('single')} className="accent-accent-app w-4 h-4" />
              Solo esta instancia
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-text-primary font-semibold">
              <input type="radio" name="updateMode" value="series" checked={updateMode === 'series'} onChange={() => setUpdateMode('series')} className="accent-accent-app w-4 h-4" />
              Toda la serie (Futura e Histórica)
            </label>
          </div>
          {updateMode === 'series' && (
            <p className="text-xs text-amber-400 italic">Nota: Al editar toda la serie, se actualizará el concepto, monto y categoría para todas las instancias asociadas. Las fechas y la frecuencia no serán modificadas.</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto flex flex-col gap-6">

        <div className="flex flex-col gap-6 items-stretch">

          {/* Card 1: Información Básica */}
          <div className="card flex flex-col gap-6 w-full transition-all duration-500">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">Detalles Principales</h3>

            <div className="flex flex-col gap-2">
              <label htmlFor="concept" className="text-sm font-semibold text-text-secondary ml-1">Concepto *</label>
              <input
                type="text"
                id="concept"
                name="concept"
                value={formData.concept}
                onChange={handleChange}
                placeholder="Ej. Salario quincenal, Venta de equipo..."
                required
                className="input"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="amount" className="text-sm font-semibold text-text-secondary ml-1">Monto {formData.divisa_original !== baseCurrency ? '(Moneda Original)' : ''} *</label>
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
                  className={`input w-full pr-24 font-mono font-bold ${useDesglose ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <select
                  name="divisa_original"
                  value={formData.divisa_original}
                  onChange={handleChange}
                  className="absolute right-0 top-0 bottom-0 bg-transparent border-l border-border-app text-sm font-bold text-text-secondary w-24 text-center focus:outline-none focus:text-accent-app cursor-pointer uppercase rounded-r-2xl"
                >
                  {settings?.divisas_activas?.map(cur => (
                    <option key={cur} value={cur}>{cur}</option>
                  ))}
                </select>
              </div>

              {formData.divisa_original !== baseCurrency && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono mt-1 px-1 gap-1">
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
              <label htmlFor="date" className="text-sm font-semibold text-text-secondary ml-1">Fecha *</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="input font-mono [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Opciones Avanzadas */}
          {isExtended && (
            <>
              {/* Card 2: Clasificación */}
              <div className="card flex flex-col gap-6 w-full">
                <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">Clasificación</h3>

                <div className="flex flex-col gap-2">
                  <label htmlFor="category" className="text-sm font-semibold text-text-secondary ml-1">Categoría</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="input cursor-pointer"
                  >
                    <option value="">Seleccionar categoría...</option>
                    <option value="salary">Salario</option>
                    <option value="business">Negocio</option>
                    <option value="freelance">Freelance</option>
                    <option value="investments">Inversiones</option>
                    <option value="gifts">Regalos</option>
                    <option value="other">Otros</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="account" className="text-sm font-semibold text-text-secondary ml-1">Cuenta Destino</label>
                  <select
                    id="account"
                    name="account"
                    value={formData.account}
                    onChange={handleChange}
                    className="input cursor-pointer"
                  >
                    <option value="">Seleccionar cuenta...</option>
                    <option value="cash">Efectivo</option>
                    <option value="bank_main">Cuenta Principal</option>
                    <option value="savings">Ahorros</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="notes" className="text-sm font-semibold text-text-secondary ml-1">Notas Adicionales</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Detalles sobre este ingreso..."
                    rows="3"
                    className="input resize-y"
                  ></textarea>
                </div>
              </div>

              {/* Card 3: Desglose */}
              <div className="card flex flex-col gap-6 w-full">
                <div className="flex items-center justify-between pb-2 border-b border-border-app/30">
                  <div className="flex flex-col">
                    <h3 className="text-lg font-bold text-text-primary">Desglose (Cuentas Divididas)</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={useDesglose} onChange={() => setUseDesglose(!useDesglose)} />
                    <div className="w-11 h-6 bg-surface-app/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-secondary peer-checked:after:bg-bg-app after:border-border-app after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-app"></div>
                  </label>
                </div>

                {useDesglose ? (
                  <div className="flex flex-col gap-4 mt-2">
                    <p className="text-xs text-text-secondary">El monto principal se calculará en base a la suma o resta de estas sub-transacciones.</p>

                    {formData.desglose.length > 0 && (
                      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {formData.desglose.map(item => (
                          <div key={item.id} className="flex items-center justify-between bg-bg-app rounded-xl px-4 py-3 border border-border-app/30">
                            <span className="text-text-primary text-sm truncate max-w-[50%]">{item.descripcion}</span>
                            <div className="flex items-center gap-4">
                              <span className={`font-mono text-sm font-bold ${item.operacion === 'suma' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {item.operacion === 'suma' ? '+' : '-'}${parseFloat(item.monto).toFixed(2)}
                              </span>
                              <button type="button" onClick={() => handleRemoveDesglose(item.id)} className="text-text-secondary hover:text-rose-400 font-bold px-1 rounded-full cursor-pointer">×</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-2 pt-2 border-t border-border-app/20">
                      <input
                        type="text"
                        name="descripcion"
                        placeholder="Descripción (Ej. Transferencia Juan)"
                        value={newDesgloseItem.descripcion}
                        onChange={handleDesgloseChange}
                        className="input w-full"
                      />
                      <div className="flex gap-2 w-full">
                        <select
                          name="operacion"
                          value={newDesgloseItem.operacion}
                          onChange={handleDesgloseChange}
                          className="input text-center cursor-pointer !px-2 !pr-8"
                          style={{ width: '6rem' }}
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
                          className="input flex-1 font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleAddDesglose}
                          className="btn-secondary !px-4"
                        >
                          Añadir
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary italic">Activa esta opción si este ingreso está compuesto por múltiples partes o incluye deducciones y comisiones que deseas rastrear de forma separada.</p>
                )}
              </div>

              {/* Card 4: Recurrencia */}
              {(!isEditing || (isEditing && hasGroup && updateMode === 'series')) && (
                <div className="card flex flex-col gap-6 w-full">
                  <div className="flex flex-col gap-4">
                    {isEditing ? (
                      <p className="text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 p-4 rounded-xl">
                        Nota: Al editar una serie existente, los parámetros de fechas y frecuencia están bloqueados por seguridad. Para cambiar la frecuencia, elimina la serie desde la base de datos y crea una nueva.
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input type="checkbox" name="es_recurrente" className="sr-only peer" checked={formData.es_recurrente} onChange={handleChange} />
                            <div className="w-11 h-6 bg-surface-app/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-secondary peer-checked:after:bg-bg-app after:border-border-app after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-app"></div>
                          </label>
                          <div className="flex flex-col">
                            <span className="text-lg font-bold text-text-primary">Ingreso Recurrente</span>
                            <span className="text-xs text-text-secondary">Genera automáticamente futuros registros basados en un patrón.</span>
                          </div>
                        </div>

                        {formData.es_recurrente && (
                          <div className="flex flex-col xl:flex-row gap-6 mt-4">
                            <div className="flex flex-col gap-6 xl:w-1/3">
                              <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-text-secondary ml-1">Frecuencia</label>
                                <select name="frecuencia" value={formData.frecuencia} onChange={handleChange} className="input cursor-pointer">
                                  <option value="semanal">Semanal</option>
                                  <option value="quincenal">Quincenal</option>
                                  <option value="mensual">Mensual</option>
                                </select>
                              </div>

                              <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-text-secondary ml-1">Duración Límite (Opcional)</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    id="limite_recurrencia"
                                    name="limite_recurrencia"
                                    value={formData.limite_recurrencia}
                                    onChange={handleChange}
                                    placeholder="Ej. 12"
                                    min="1"
                                    className="input w-full pr-24 font-mono"
                                  />
                                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-secondary pointer-events-none">
                                    {formData.frecuencia === 'semanal' ? 'Semanas' : formData.frecuencia === 'quincenal' ? 'Quincenas' : 'Meses'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {projectedDates.length > 0 && (
                              <div className="bg-bg-app rounded-2xl border border-border-app/30 p-5 flex flex-col gap-4 flex-1">
                                <div className="flex justify-between items-center border-b border-border-app/30 pb-3">
                                  <h4 className="text-sm font-bold text-accent-app">
                                    {formData.limite_recurrencia ? 'Fechas Proyectadas' : 'Próximas 5 Fechas (Vista Previa)'}
                                  </h4>
                                  {formData.limite_recurrencia && (
                                    <button
                                      type="button"
                                      onClick={() => setIsCustomizingDates(!isCustomizingDates)}
                                      className={isCustomizingDates ? 'btn-primary px-3 py-1.5 text-xs' : 'btn-secondary px-3 py-1.5 text-xs'}
                                    >
                                      {isCustomizingDates ? 'Terminar Edición' : 'Editar Fechas'}
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                                  {projectedDates.map((d, i) => (
                                    <div key={i} className="flex flex-col gap-1.5">
                                      <span className="text-[10px] font-bold text-text-secondary pl-1">Iteración {i + 1}</span>
                                      {isCustomizingDates ? (
                                        <input
                                          type="date"
                                          value={d}
                                          onChange={(e) => handleCustomDateChange(i, e.target.value)}
                                          className="input !py-1.5 text-xs"
                                        />
                                      ) : (
                                        <span className="text-xs font-mono bg-surface-app rounded-xl border border-border-app/30 py-2 px-2 text-text-primary text-center truncate">
                                          {d}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {!formData.limite_recurrencia && (
                                  <p className="text-xs text-text-secondary italic mt-2">Como no hay límite especificado, la serie se tratará como un ingreso infinito que genera alertas al pasar cada periodo.</p>
                                )}
                                {formData.limite_recurrencia && (
                                  <div className="flex justify-between items-center mt-2 bg-emerald-400/10 p-3 rounded-xl border border-emerald-400/20">
                                    <span className="text-sm text-text-primary">Proyección Total:</span>
                                    <span className="text-sm text-emerald-400 font-mono font-bold">
                                      {(parseFloat(formData.amount || 0) * (formData.tasa_cambio ? parseFloat(formData.tasa_cambio) : 1) * parseInt(formData.limite_recurrencia)).toFixed(2)} {baseCurrency}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Barra de Acciones Fija (Bottom) */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
          <button
            type="button"
            onClick={() => setIsExtended(!isExtended)}
            className="text-sm font-semibold text-text-secondary hover:text-accent-app transition-colors cursor-pointer mr-auto w-full sm:w-auto text-left flex items-center gap-2 select-none"
          >
            {isExtended ? 'Esconder Opciones Avanzadas' : 'Ver Opciones Avanzadas'}
            <ChevronDown size={16} className={`transform transition-transform ${isExtended ? 'rotate-180' : ''}`} />
          </button> 

          <div className="flex w-full sm:w-auto gap-3">
            <button
              type="button"
              onClick={onCancel || (() => setView('list'))}
              className="btn-secondary flex-1 sm:flex-none px-8"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 sm:flex-none px-8 shadow-lg shadow-accent-app/20"
            >
              {isEditing ? 'Guardar Cambios' : 'Guardar Ingreso'}
            </button>
          </div>
        </div>

      </form>
    </div>
  )
}
