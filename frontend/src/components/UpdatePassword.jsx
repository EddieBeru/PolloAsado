import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import pollo from '../assets/pollo.svg'

// Pantalla de cambio de contraseña (flujo de recuperación de Supabase).
// Se muestra cuando onAuthStateChange emite 'PASSWORD_RECOVERY': ya existe una
// sesión temporal válida, así que basta con updateUser({ password }).
export default function UpdatePassword({ onDone, onCancel }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setDone(true)
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='w-full flex flex-row gap-8 my-auto justify-center'>
      <div className='lg:flex hidden w-full max-w-md card highlight flex-col gap-4 my-auto shadow-2xl shadow-bg-app items-center'>
        <div className='flex items-center justify-center'>
          <img src={pollo} className='size-30 relative drop-shadow-xl' alt="PolloAsado Logo" />
        </div>
        <div className='text-center'>
          <h1 className='font-bold text-xl'>Cambio de contraseña</h1>
          <h3 className='font-light text-sm mt-2'>
            Elige una nueva contraseña para tu cuenta.<br />
            Después de guardarla podrás seguir usando PolloAsado con normalidad.
          </h3>
        </div>
      </div>

      <div className="w-full max-w-md card flex flex-col gap-8 my-auto shadow-2xl shadow-bg-app">
        <div className="flex flex-col gap-2 text-center">
          <h2 className="heading">Nueva contraseña</h2>
          <p className="text-sm text-text-secondary">
            {done ? 'Contraseña actualizada' : 'Ingresa tu nueva contraseña'}
          </p>
        </div>

        {done ? (
          <div className="flex flex-col gap-5">
            <div className="text-sm text-emerald-400 font-medium bg-emerald-950/20 border border-emerald-900/50 rounded-xl p-4">
              Tu contraseña se cambió correctamente.
            </div>
            <button onClick={onDone} className="btn-primary w-full">
              Continuar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="new-password-input" className="text-sm font-semibold text-text-primary ml-1">
                Nueva contraseña
              </label>
              <input
                id="new-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="confirm-password-input" className="text-sm font-semibold text-text-primary ml-1">
                Confirmar contraseña
              </label>
              <input
                id="confirm-password-input"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="input"
              />
            </div>

            {error && (
              <div className="text-sm text-rose-500 font-medium bg-rose-950/20 border border-rose-900/50 rounded-xl p-4">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>

            {onCancel && (
              <button type="button" onClick={onCancel} className="text-sm text-text-secondary hover:text-text-primary text-center">
                Cancelar
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
