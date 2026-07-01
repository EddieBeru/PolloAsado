import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import pollo from '../assets/pollo.svg'

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
    <div className='w-full flex flex-row gap-8 my-auto justify-center'>
      <div className='lg:flex hidden w-full max-w-md card highlight flex-col gap-4 my-auto shadow-2xl shadow-bg-app items-center'>
        <div className='flex items-center justify-center'>
          <img
            src={pollo}
            className='size-30 relative drop-shadow-xl'
            alt="PolloAsado Logo"
          />
        </div>
        <div className='text-center'>
          <h1 className='font-bold text-xl'>¡Bienvenid@ a PolloAsado!</h1>
          <h2 className='font-semibold text-35 -mt-1'>Que el nombre no te confunda.</h2>
          <h3 className='font-light text-sm mt-2'>
            Te damos la bienvenida a tu plataforma de manejo de finanzas favorita.<br />
            Te ayudamos a entender qué ocurre con tu dinero y te damos consejos para que cada colón dure más.
          </h3>
          <p className='font-light text-gray-400 text-sm mt-8'>Proyecto desarrollado por un par de estudiantes entusiastas.</p>
        </div>
      </div>
      <div className="w-full max-w-md card flex flex-col gap-8 my-auto shadow-2xl shadow-bg-app">
        <div className="flex flex-col gap-2 text-center">
          <h2 className="heading">PolloAsado</h2>
          <p className="text-sm text-text-secondary">
            {isSignUp ? 'Crea una cuenta' : 'Ingresa tus credenciales'}
          </p>
        </div>

        <div className="flex bg-bg-app rounded-2xl p-1">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false)
              setError(null)
              setSuccessMessage('')
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${!isSignUp ? 'bg-surface-app shadow-sm text-accent-app' : 'text-text-secondary hover:text-text-primary'
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
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${isSignUp ? 'bg-surface-app shadow-sm text-accent-app' : 'text-text-secondary hover:text-text-primary'
              }`}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          {isSignUp && (
            <div className="flex flex-col gap-2">
              <label htmlFor="name-input" className="text-sm font-semibold text-text-primary ml-1">
                Nombre
              </label>
              <input
                id="name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="input"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="email-input" className="text-sm font-semibold text-text-primary ml-1">
              Correo Electrónico
            </label>
            <input
              id="email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              className="input"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password-input" className="text-sm font-semibold text-text-primary ml-1">
              Contraseña
            </label>
            <input
              id="password-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input"
            />
          </div>

          {error && (
            <div className="text-sm text-rose-500 font-medium bg-rose-950/20 border border-rose-900/50 rounded-xl p-4">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="text-sm text-emerald-400 font-medium bg-emerald-950/20 border border-emerald-900/50 rounded-xl p-4">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2"
          >
            {loading ? 'Procesando...' : isSignUp ? 'Registrarse' : 'Ingresar'}
          </button>
        </form>

        {/* Theme Picker inside Login page */}
        {theme && setTheme && (
          <div className="flex flex-col gap-3 pt-6 border-t border-border-app/30 items-center">
            <span className="text-xs font-semibold text-text-secondary">Paleta de color</span>
            <div className="flex gap-2">
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
                  className={`w-6 h-6 rounded-full border-2 ${t.color} cursor-pointer transition-transform duration-150 ${theme === t.id ? 'scale-110 border-text-primary' : 'border-transparent hover:scale-105'
                    }`}
                  title={t.name}
                  aria-label={`Cambiar a tema ${t.name}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
