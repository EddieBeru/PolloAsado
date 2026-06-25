import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login({ theme, setTheme }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage('')
    setLoading(true)

    try {
      if (isSignUp) {
        // Sign up with Supabase auth
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nombre: name
            }
          }
        })

        if (signUpError) throw signUpError

        // If user is successfully signed up and profile is created, we notify them
        // Supabase may require email confirmation depending on settings.
        if (data?.user && data.user.identities?.length === 0) {
          setSuccessMessage('El correo ya está registrado. Intenta iniciar sesión.')
        } else {
          setSuccessMessage('Registro exitoso. Si es necesario, verifica tu correo o inicia sesión.')
        }
      } else {
        // Sign in with password
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (signInError) throw signInError
      }
    } catch (err) {
      setError(err.message || 'Ocurrió un error inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-surface-app border border-accent-app/30 p-8 flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-accent-app">PolloAsado</h2>
        <p className="text-xs text-text-secondary">
          {isSignUp ? 'Crea una cuenta para empezar' : 'Ingresa tus credenciales para continuar'}
        </p>
      </div>

      <div className="flex border-b border-border-app">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(false)
            setError(null)
            setSuccessMessage('')
          }}
          className={`flex-1 pb-2 text-sm font-semibold tracking-wide transition-colors duration-150 cursor-pointer ${
            !isSignUp ? 'text-accent-app border-b-2 border-accent-app' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Iniciar Sesión
        </button>
        <button
          type="button"
          onClick={() => {
            setIsSignUp(true)
            setError(null)
            setSuccessMessage('')
          }}
          className={`flex-1 pb-2 text-sm font-semibold tracking-wide transition-colors duration-150 cursor-pointer ${
            isSignUp ? 'text-accent-app border-b-2 border-accent-app' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Registrarse
        </button>
      </div>

      <form onSubmit={handleAuth} className="flex flex-col gap-4">
        {isSignUp && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name-input" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Nombre
            </label>
            <input
              id="name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="bg-bg-app border border-accent-app/20 text-text-primary px-3 py-2 text-sm outline-none focus:border-accent-app transition-colors duration-150"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email-input" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Correo Electrónico
          </label>
          <input
            id="email-input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ejemplo@correo.com"
            className="bg-bg-app border border-accent-app/20 text-text-primary px-3 py-2 text-sm outline-none focus:border-accent-app transition-colors duration-150"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password-input" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Contraseña
          </label>
          <input
            id="password-input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-bg-app border border-accent-app/20 text-text-primary px-3 py-2 text-sm outline-none focus:border-accent-app transition-colors duration-150"
          />
        </div>

        {error && (
          <div className="text-xs text-rose-500 font-medium bg-rose-950/20 border border-rose-900/50 p-3">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="text-xs text-emerald-400 font-medium bg-emerald-950/20 border border-emerald-900/50 p-3">
            {successMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent-app hover:bg-opacity-90 active:scale-[0.98] text-bg-app font-bold py-2.5 text-sm transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Procesando...' : isSignUp ? 'Registrarse' : 'Ingresar'}
        </button>
      </form>

      {/* Theme Picker inside Login page */}
      {theme && setTheme && (
        <div className="flex flex-col gap-2 pt-4 border-t border-accent-app/20 items-center">
          <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Paleta de color</span>
          <div className="flex gap-1.5">
            {[
              { id: 'slate', name: 'Gris', color: 'bg-slate-400' },
              { id: 'emerald', name: 'Verde', color: 'bg-emerald-400' },
              { id: 'sky', name: 'Azul', color: 'bg-sky-400' },
              { id: 'amber', name: 'Oro', color: 'bg-amber-400' },
              { id: 'rose', name: 'Rosa', color: 'bg-rose-500' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`w-5 h-5 rounded-full border ${t.color} cursor-pointer transition-transform duration-100 ${
                  theme === t.id ? 'scale-110 border-text-primary' : 'border-border-app hover:scale-105'
                }`}
                title={t.name}
                aria-label={`Cambiar a tema ${t.name}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
