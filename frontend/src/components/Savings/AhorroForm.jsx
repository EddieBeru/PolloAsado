import { useState } from 'react'
import { toNumber } from '../../lib/format'

const MAX_NOMBRE = 60

export default function AhorroForm({ initialData, onSubmit, onCancel }) {
    const isEditing = !!initialData
    const [formData, setFormData] = useState({
        nombre: initialData?.nombre || '',
        monto_meta: initialData?.monto_meta || '',
        monto_actual: initialData?.monto_actual || '0',
        es_automatico: initialData?.es_automatico || false,
        frecuencia: initialData?.frecuencia || 'mensual',
        monto_automatico: initialData?.monto_automatico || ''
    })
    const [fieldErrors, setFieldErrors] = useState({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    }

    const validate = () => {
        const errors = {}
        const nombre = formData.nombre.trim()
        if (!nombre) errors.nombre = 'Ponele un nombre a esta meta.'
        else if (nombre.length > MAX_NOMBRE) errors.nombre = `Máximo ${MAX_NOMBRE} caracteres.`

        const meta = toNumber(formData.monto_meta, NaN)
        if (!Number.isFinite(meta) || meta <= 0) errors.monto_meta = 'Escribí un monto meta mayor que cero.'

        if (!isEditing) {
            const actual = toNumber(formData.monto_actual, NaN)
            if (!Number.isFinite(actual) || actual < 0) errors.monto_actual = 'Escribí un monto inicial válido (o dejalo en 0).'
        }

        if (formData.es_automatico) {
            const automatico = toNumber(formData.monto_automatico, NaN)
            if (!Number.isFinite(automatico) || automatico <= 0) errors.monto_automatico = 'Escribí cuánto se abona automáticamente.'
        }

        return errors
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (isSubmitting) return
        const errors = validate()
        setFieldErrors(errors)
        if (Object.keys(errors).length > 0) return

        setIsSubmitting(true)
        await onSubmit({ ...formData, nombre: formData.nombre.trim() })
        setIsSubmitting(false)
    }

    return (
        <form onSubmit={handleSubmit} className="card flex flex-col gap-6 w-full max-w-xl">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">
                {isEditing ? 'Editar meta' : 'Nueva meta de ahorro'}
            </h3>

            <div className="flex flex-col gap-2">
                <label htmlFor="nombre" className="text-sm font-semibold text-text-secondary ml-1">Nombre *</label>
                <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Ej. Fondo de emergencia"
                    maxLength={MAX_NOMBRE}
                    aria-invalid={!!fieldErrors.nombre}
                    className="input"
                />
                {fieldErrors.nombre && <p className="text-xs text-negative ml-1">{fieldErrors.nombre}</p>}
            </div>

            <div className="flex flex-col gap-2">
                <label htmlFor="monto_meta" className="text-sm font-semibold text-text-secondary ml-1">Monto meta *</label>
                <input
                    type="number"
                    id="monto_meta"
                    name="monto_meta"
                    value={formData.monto_meta}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    aria-invalid={!!fieldErrors.monto_meta}
                    className="input font-mono"
                />
                {fieldErrors.monto_meta && <p className="text-xs text-negative ml-1">{fieldErrors.monto_meta}</p>}
            </div>

            {!isEditing && (
                <div className="flex flex-col gap-2">
                    <label htmlFor="monto_actual" className="text-sm font-semibold text-text-secondary ml-1">Monto actual</label>
                    <input
                        type="number"
                        id="monto_actual"
                        name="monto_actual"
                        value={formData.monto_actual}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        aria-invalid={!!fieldErrors.monto_actual}
                        className="input font-mono"
                    />
                    {fieldErrors.monto_actual && <p className="text-xs text-negative ml-1">{fieldErrors.monto_actual}</p>}
                </div>
            )}

            <div className="flex flex-col gap-2 pt-4 border-t border-border-app/20">
                <label className="relative inline-flex items-center gap-3 cursor-pointer select-none">
                    <input type="checkbox" name="es_automatico" className="sr-only peer" checked={formData.es_automatico} onChange={handleChange} />
                    <div className="w-11 h-6 bg-surface-app/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-secondary peer-checked:after:bg-bg-app after:border-border-app after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-app"></div>
                    <span className="text-sm font-semibold text-text-primary">Abono automático</span>
                </label>

                {formData.es_automatico && (
                    <div className="flex gap-3 mt-2">
                        <select name="frecuencia" value={formData.frecuencia} onChange={handleChange} className="input cursor-pointer">
                            <option value="semanal">Semanal</option>
                            <option value="quincenal">Quincenal</option>
                            <option value="mensual">Mensual</option>
                        </select>
                        <input
                            type="number"
                            name="monto_automatico"
                            value={formData.monto_automatico}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            placeholder="Monto"
                            className="input flex-1 font-mono"
                        />
                    </div>
                )}
                {fieldErrors.monto_automatico && <p className="text-xs text-negative ml-1">{fieldErrors.monto_automatico}</p>}
            </div>

            <div className="flex gap-3 mt-2">
                <button type="button" onClick={onCancel} disabled={isSubmitting} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                    {isSubmitting ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear meta'}
                </button>
            </div>
        </form>
    )
}
