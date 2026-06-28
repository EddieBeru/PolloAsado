import { useState} from "react";

 export default function DebtForm({user, onCancel, onSave}) {// esto es una funcion en javascript
    const [formData, setFormData]= useState({
        amount: '', due_date: ''
    })
    const handleChange =(e)=> {
         const nuevaData = { ...formData, [e.target.name]: e.target.value }
    setFormData(nuevaData)
    onPreview?.(nuevaData)
    }
    const handleSubmit= (e)=> { //validar antes de gcduardar en base de datos
         e.preventDefault() 
         if (!formData.amount|| !formData.due_date){
            alert("Please add the debt amount and the due date")
            return
        }
        onSave(formData)// inyectar en base de datos la informacion 
       
    }
    return (
    
    <div className="w-full card p-6 animate-in fade-in duration-300">
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
            className="input w-full"   // Estilo unificado del proyecto
          />
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
            className="input w-full"   // Estilo unificado del proyecto
          />
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