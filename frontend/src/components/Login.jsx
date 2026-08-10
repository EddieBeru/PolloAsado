import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { authErrorMessage } from '../lib/authErrors'
import { Palette } from 'lucide-react'
import pollo from '../assets/pollo.svg'

const THEME_OPTIONS = [
  { id: 'slate', name: 'Arena', color: 'bg-[var(--accent-slate)]' },
  { id: 'emerald', name: 'Verde', color: 'bg-[var(--accent-emerald)]' },
  { id: 'sky', name: 'Azul', color: 'bg-[var(--accent-sky)]' },
  { id: 'amber', name: 'Oro', color: 'bg-[var(--accent-amber)]' },
  { id: 'rose', name: 'Rosa', color: 'bg-[var(--accent-rose)]' }
]

export default function Login({ theme, setTheme }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showThemes, setShowThemes] = useState(false)

  const handleAuth = async (e) => {
    e.preventDefault()
    if (loading) return // doble submit
    setError(null)
    setSuccessMessage('')
    setLoading(true)

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nombre: name } }
        })

        if (signUpError) throw signUpError

        if (data?.user && data.user.identities?.length === 0) {
          setSuccessMessage('Ese correo ya tiene cuenta. Iniciá sesión.')
        } else {
          setSuccessMessage('Cuenta creada. Si te pedimos confirmar el correo, buscá el mensaje que te enviamos.')
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
      }
    } catch (err) {
      setError(authErrorMessage(
        err,
        isSignUp ? 'No se pudo crear la cuenta. Intentá de nuevo.' : 'No se pudo iniciar sesión. Intentá de nuevo.'
      ))
    } finally {
      setLoading(false)
    }
  }

  // Enviar enlace de acceso por correo (inicio de sesión sin contraseña).
  const handleMagicLink = async () => {
    setError(null)
    setSuccessMessage('')
    if (!email) {
      setError('Escribí tu correo primero.')
      return
    }
    setLoading(true)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin, shouldCreateUser: false }
      })
      if (otpError) throw otpError
      setSuccessMessage(`Te enviamos un enlace a ${email}. Abrilo desde este dispositivo para entrar.`)
    } catch (err) {
      setError(authErrorMessage(err, 'No se pudo enviar el enlace. Intentá de nuevo.'))
    } finally {
      setLoading(false)
    }
  }

  // Enviar enlace de cambio de contraseña.
  const handleResetPassword = async () => {
    setError(null)
    setSuccessMessage('')
    if (!email) {
      setError('Escribí tu correo primero.')
      return
    }
    setLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      })
      if (resetError) throw resetError
      setSuccessMessage(`Te enviamos un enlace a ${email} para cambiar tu contraseña.`)
    } catch (err) {
      setError(authErrorMessage(err, 'No se pudo enviar el enlace. Intentá de nuevo.'))
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
          <h1 className='font-bold text-xl'>PolloAsado</h1>
          <h2 className='font-semibold text-35 -mt-1'>Que el nombre no te confunda.</h2>
          <h3 className='font-light text-sm mt-2'>
            Anotá lo que entra y lo que sale, con el detalle de cada movimiento,
            y mirá en qué se te va la plata.
          </h3>
          <p className='font-light text-text-secondary text-sm mt-8'>Un proyecto de un par de estudiantes.</p>
        </div>
      </div>

      <div className="relative w-full max-w-md card flex flex-col gap-6 my-auto shadow-2xl shadow-bg-app">
        {/* Selector de paleta: discreto, en la esquina */}
        {theme && setTheme && (
          <div className="absolute top-4 right-4">
            <button
              type="button"
              onClick={() => setShowThemes((s) => !s)}
              className="btn-icon"
              title="Cambiar el color de la app"
              aria-label="Cambiar el color de la app"
              aria-expanded={showThemes}
            >
              <Palette className="w-4 h-4" />
            </button>
            {showThemes && (
              <div className="absolute right-0 mt-2 flex gap-2 bg-bg-app border border-border-app/60 rounded-2xl p-2.5 shadow-xl">
                {THEME_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTheme(t.id); setShowThemes(false) }}
                    className={`w-6 h-6 rounded-full border-2 ${t.color} cursor-pointer transition-transform duration-100 ${theme === t.id ? 'scale-110 border-text-primary' : 'border-transparent hover:scale-105'}`}
                    title={t.name}
                    aria-label={`Cambiar a tema ${t.name}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col items-center gap-2 text-center">
          <img src={pollo} className="size-12 lg:hidden" alt="PolloAsado Logo" />
          <h2 className="heading">PolloAsado</h2>
        </div>

        <div className="flex bg-bg-app rounded-2xl p-1">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(null); setSuccessMessage('') }}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${!isSignUp ? 'bg-surface-app shadow-sm text-accent-app' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(null); setSuccessMessage('') }}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${isSignUp ? 'bg-surface-app shadow-sm text-accent-app' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
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
                maxLength={80}
                autoComplete="name"
                className="input"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="email-input" className="text-sm font-semibold text-text-primary ml-1">
              Correo
            </label>
            <input
              id="email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              autoComplete="email"
              inputMode="email"
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
              minLength={isSignUp ? 6 : undefined}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              className="input"
            />
          </div>

          {error && (
            <div className="notice-negative" role="alert">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="notice-positive" role="status">
              {successMessage}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
            {loading
              ? (isSignUp ? 'Creando la cuenta…' : 'Entrando…')
              : (isSignUp ? 'Crear cuenta' : 'Iniciar sesión')}
          </button>

          {!isSignUp && (
            <div className="flex items-center justify-center gap-4 text-sm">
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={loading}
                className="text-accent-app hover:opacity-80 font-semibold cursor-pointer disabled:opacity-50"
              >
                Entrar con un enlace por correo
              </button>
              <span className="text-border-app">·</span>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                className="text-text-secondary hover:text-text-primary cursor-pointer disabled:opacity-50"
              >
                Olvidé mi contraseña
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
