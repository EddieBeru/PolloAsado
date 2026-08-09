import { useState, useEffect } from 'react'
import { useOutcomes } from '../../hooks/useOutcomes'
import { useSettings } from '../../hooks/useSettings'
import { formatMoney, toNumber } from '../../lib/format'
import { ArrowLeft, ChevronDown } from 'lucide-react'

// Topes de captura. No son reglas de negocio: evitan que un dedo pegado o un
// pegado accidental deje un registro imposible de leer o de guardar.
const MAX_CONCEPT = 120
const MAX_NOTES = 500
const MAX_DESGLOSE_DESC = 120
const MAX_AMOUNT = 1e12

export default function OutcomeForm({ user, setView, initialData, onCancel }) {
    const { settings, getCachedRate, setCachedRate } = useSettings()
    const baseCurrency = settings?.divisa_principal || 'CRC'

    const [isExtended, setIsExtended] = useState(false)
    const [useDesglose, setUseDesglose] = useState(false)

    const [isCustomizingDates, setIsCustomizingDates] = useState(false)
    const [projectedDates, setProjectedDates] = useState([])

    const { addOutcome, updateOutcome } = useOutcomes(user)

    const [updateMode, setUpdateMode] = useState('single') // 'single' | 'series'
    const isEditing = !!initialData

    const [formData, setFormData] = useState({
        amount: initialData?.amount || '',
        concept: initialData?.concept || '',
        date: initialData?.date || new Date().toISOString().split('T')[0],
        category: initialData?.category || '',
        account: initialData?.account || '',
        notes: initialData?.notes || '',
        desglose: initialData?.desglose || [],
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

    // El total del desglose puede dar negativo (deducciones > sumas). Lo dejamos
    // ver tal cual en vez de silenciarlo a 0.00: la validación lo bloquea al
    // guardar y el usuario entiende por qué.
    const desgloseTotal = (items) => items.reduce((acc, curr) => {
        const val = toNumber(curr.monto)
        return curr.operacion === 'suma' ? acc + val : acc - val
    }, 0)

    const [desgloseError, setDesgloseError] = useState('')

    const handleAddDesglose = () => {
        const descripcion = newDesgloseItem.descripcion.trim()
        const monto = toNumber(newDesgloseItem.monto)

        if (!descripcion) { setDesgloseError('Poné una descripción.'); return }
        if (monto <= 0) { setDesgloseError('El monto de la parte tiene que ser mayor que cero.'); return }
        setDesgloseError('')

        // UUID propio: la fila viaja a Supabase con este id y la columna es uuid.
        const item = { ...newDesgloseItem, descripcion, id: crypto.randomUUID() }
        const updatedDesglose = [...formData.desglose, item]

        setFormData({ ...formData, desglose: updatedDesglose, amount: desgloseTotal(updatedDesglose).toFixed(2) })
        setNewDesgloseItem({ descripcion: '', monto: '', operacion: 'suma' })
    }

    const handleRemoveDesglose = (id) => {
        const updatedDesglose = formData.desglose.filter(i => i.id !== id)
        setFormData({ ...formData, desglose: updatedDesglose, amount: desgloseTotal(updatedDesglose).toFixed(2) })
    }

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formError, setFormError] = useState(null)
    const [fieldErrors, setFieldErrors] = useState({})

    const validate = () => {
        const errors = {}

        const concept = formData.concept.trim()
        if (!concept) errors.concept = 'Escribí un concepto para reconocer este gasto.'
        else if (concept.length > MAX_CONCEPT) errors.concept = `Máximo ${MAX_CONCEPT} caracteres.`

        const amount = toNumber(formData.amount, NaN)
        if (!Number.isFinite(amount)) errors.amount = 'Escribí un monto válido.'
        else if (amount <= 0) {
            errors.amount = useDesglose
                ? 'El desglose suma cero o menos. Revisá las partes.'
                : 'El monto tiene que ser mayor que cero.'
        } else if (amount > MAX_AMOUNT) errors.amount = 'Ese monto es demasiado grande.'

        if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) errors.date = 'Elegí una fecha válida.'

        if (!formData.category) errors.category = 'Elegí una categoría.'

        if (formData.notes && formData.notes.length > MAX_NOTES) {
            errors.notes = `Máximo ${MAX_NOTES} caracteres.`
        }

        return errors
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (isSubmitting) return // doble clic / doble Enter

        const errors = validate()
        setFieldErrors(errors)
        if (Object.keys(errors).length > 0) {
            setFormError('Revisá los campos marcados.')
            return
        }

        setFormError(null)
        setIsSubmitting(true)

        const finalData = {
            ...formData,
            concept: formData.concept.trim(),
            notes: (formData.notes || '').trim(),
            fechas_proyectadas: projectedDates
        }

        try {
            if (isEditing) {
                await updateOutcome(initialData.id, finalData, updateMode)
            } else {
                await addOutcome(finalData)
            }
        } catch (err) {
            // El guardado local falló (no la nube: eso se reintenta solo). Nos
            // quedamos en el formulario con todo lo escrito intacto.
            console.error('No se pudo guardar el gasto:', err)
            setFormError('No se pudo guardar el gasto. Lo que escribiste sigue acá: intentá de nuevo.')
            setIsSubmitting(false)
            return
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
                        {isEditing ? 'Editar Gasto' : 'Registrar Gasto'}
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
                                placeholder="Ej. Súper, recibo de luz, gasolina..."
                                required
                                maxLength={MAX_CONCEPT}
                                aria-invalid={!!fieldErrors.concept}
                                aria-describedby={fieldErrors.concept ? 'concept-error' : undefined}
                                className="input"
                            />
                            {fieldErrors.concept && (
                                <p id="concept-error" className="text-xs text-negative ml-1">{fieldErrors.concept}</p>
                            )}
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
                                    inputMode="decimal"
                                    required
                                    disabled={useDesglose}
                                    aria-invalid={!!fieldErrors.amount}
                                    aria-describedby={fieldErrors.amount ? 'amount-error' : undefined}
                                    className={`input w-full pr-24 font-mono font-bold num ${useDesglose ? 'opacity-50 cursor-not-allowed' : ''}`}
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

                            {fieldErrors.amount && (
                                <p id="amount-error" className="text-xs text-negative ml-1">{fieldErrors.amount}</p>
                            )}

                            {formData.divisa_original !== baseCurrency && (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono mt-1 px-1 gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className={rateError ? 'text-warning' : 'text-text-secondary'}>
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
                                        <span className="num text-text-primary font-bold">
                                            Total: {formatMoney(toNumber(formData.amount) * toNumber(formData.tasa_cambio), baseCurrency)}
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
                                aria-invalid={!!fieldErrors.date}
                                aria-describedby={fieldErrors.date ? 'date-error' : undefined}
                                className="input font-mono scheme-dark"
                            />
                            {fieldErrors.date && (
                                <p id="date-error" className="text-xs text-negative ml-1">{fieldErrors.date}</p>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="category" className="text-sm font-semibold text-text-secondary ml-1">Categoría *</label>
                            <select
                                id="category"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="input cursor-pointer"
                                required
                            >
                                <option value="">Seleccionar categoría...</option>
                                <option value="Alimentación">Alimentación</option>
                                <option value="Vivienda">Vivienda</option>
                                <option value="Transporte">Transporte</option>
                                <option value="Salud">Salud</option>
                                <option value="Entretenimiento">Entretenimiento</option>
                                <option value="Educación">Educación</option>
                                <option value="Ropa">Ropa</option>
                                <option value="Servicios">Servicios</option>
                                <option value="Otros">Otros</option>
                            </select>
                            {fieldErrors.category && (
                                <p className="text-xs text-negative ml-1">{fieldErrors.category}</p>
                            )}
                        </div>
                    </div>

                    {/* Opciones Avanzadas */}
                    {isExtended && (
                        <>
                            {/* Card 2: Clasificación */}
                            <div className="card flex flex-col gap-6 w-full">
                                <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">Clasificación</h3>

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
                                        placeholder="Detalles sobre este gasto..."
                                        rows="3"
                                        maxLength={MAX_NOTES}
                                        className="input resize-y"
                                    ></textarea>
                                    {fieldErrors.notes && (
                                        <p className="text-xs text-negative ml-1">{fieldErrors.notes}</p>
                                    )}
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
                                                    <div key={item.id} className="flex items-center justify-between gap-3 bg-bg-app rounded-xl px-4 py-3 border border-border-app/30">
                                                        <span className="user-text text-text-primary text-sm max-w-[50%]" title={item.descripcion}>{item.descripcion}</span>
                                                        <div className="flex items-center gap-4 shrink-0">
                                                            <span className={`num font-mono text-sm font-bold ${item.operacion === 'suma' ? 'text-text-primary' : 'text-negative'}`}>
                                                                {item.operacion === 'suma' ? '+' : '−'}{formatMoney(item.monto, baseCurrency, { absolute: true })}
                                                            </span>
                                                            <button type="button" onClick={() => handleRemoveDesglose(item.id)} className="text-text-secondary hover:text-negative font-bold px-1 rounded-full cursor-pointer">×</button>
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
                                                maxLength={MAX_DESGLOSE_DESC}
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
                                            {desgloseError && (
                                                <p className="text-xs text-negative ml-1">{desgloseError}</p>
                                            )}
                                            {formData.desglose.length > 0 && (
                                                <div className="flex items-center justify-between pt-2 text-sm">
                                                    <span className="text-text-secondary">Suma del desglose</span>
                                                    <span className={`num font-mono font-bold ${toNumber(formData.amount) > 0 ? 'text-text-primary' : 'text-negative'}`}>
                                                        {formatMoney(formData.amount, baseCurrency)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-text-secondary italic">Activa esta opción si este gasto está compuesto por múltiples partes o incluye deducciones y comisiones que deseas rastrear de forma separada.</p>
                                )}
                            </div>
                        </>
                    )}

                </div>

                {formError && (
                    <p className="notice-negative" role="alert">{formError}</p>
                )}

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
                            disabled={isSubmitting}
                            className="btn-secondary flex-1 sm:flex-none px-8"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary flex-1 sm:flex-none px-8 shadow-lg shadow-accent-app/20"
                        >
                            {isSubmitting ? 'Guardando…' : isEditing ? 'Guardar Cambios' : 'Guardar Gasto'}
                        </button>
                    </div>
                </div>

            </form>
        </div>
    )
}
