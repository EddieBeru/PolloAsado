import { useState } from "react";
import { toNumber } from "../../lib/format";

 export default function DebtForm({ user, onCancel, onSave, onPreview }) {// esto es una funcion en javascript
    const [formData, setFormData] = useState({
        amount: '', due_date: ''
    })
    // Errores por campo: el aviso vive al lado del campo, no en un alert nativo.
    const [errors, setErrors] = useState({})

    const handleChange = (e) => {
        const nuevaData = { ...formData, [e.target.name]: e.target.value }
        setFormData(nuevaData)
        setErrors(prev => ({ ...prev, [e.target.name]: undefined }))
        onPreview?.(nuevaData)
    }

    const handleSubmit = (e) => {
        e.preventDefault()

        const nextErrors = {}
        const monto = toNumber(formData.amount, NaN)
        if (!Number.isFinite(monto) || monto <= 0) {
            nextErrors.amount = 'Escribí el monto de la deuda (mayor que cero).'
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.due_date)) {
            nextErrors.due_date = 'Elegí la fecha límite de pago.'
        }

        setErrors(nextErrors)
        if (Object.keys(nextErrors).length > 0) return

        onSave?.(formData)
    }
    return (
    
    <div className="w-full card">
      <div className="flex flex-col gap-1 mb-4">
        <h2 className="heading">Control Analítico de Deuda</h2>
        <p className="text-xs text-text-secondary">
          Registra el saldo que posees de forma informativa para simular y proyectar tu progreso de pagos.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        {/* COMPONENTE PARA EL PUNTO 1: VALOR DE LA DEUDA */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-text-secondary">
            Cantidad que posee la deuda (Monto Informativo):
          </label>
          <input 
            type="number"              // Solo permite ingresar dígitos numéricos
            name="amount"              // Nombre de la variable en el useState
            value={formData.amount}    // Enlace directo con el valor del estado
            onChange={handleChange}    // Función que lee los números al ser digitados
            placeholder="Ej: 75000"    // Texto de ejemplo en el fondo de la caja
            min="0"
            step="0.01"
            inputMode="decimal"
            aria-invalid={!!errors.amount}
            className="input w-full num"
          />
          {errors.amount && <p className="text-xs text-negative ml-1">{errors.amount}</p>}
        </div>

        {/* COMPONENTE PARA EL PUNTO 2: LAPSO DE TIEMPO / FECHA LÍMITE */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-text-secondary">
            Fecha límite de pago (Lapso para análisis):
          </label>
          <input 
            type="date"                // Despliega un calendario nativo en la pantalla
            name="due_date"            // Nombre de la variable en el useState
            value={formData.due_date}  // Enlace con la fecha seleccionada
            onChange={handleChange}    // Función que captura el día elegido
            aria-invalid={!!errors.due_date}
            className="input w-full"
          />
          {errors.due_date && <p className="text-xs text-negative ml-1">{errors.due_date}</p>}
        </div>

        {/* SECCIÓN DE BOTONES */}
        <div className="flex gap-3 justify-end mt-4">
          {/* Botón para cerrar o cancelar el registro si el usuario lo desea */}
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancelar
          </button>
          
          {/* Botón que procesa los datos y simula el registro de la deuda */}
          <button type="submit" className="btn-primary">
            Registrar Deuda
          </button>
        </div>

      </form>
    </div>
  )
 }