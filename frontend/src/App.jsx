import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './components/Login'
import UpdatePassword from './components/UpdatePassword'
import Layout from './components/Layout'
import './App.css'
import DebtForm from './components/Debt/DebtForm'

// Los únicos temas que el CSS define. Un valor guardado fuera de esta lista
// (versión vieja, storage editado a mano) dejaría la app sin acento.
const THEMES = ['slate', 'emerald', 'sky', 'amber', 'rose']
const DEFAULT_THEME = 'slate'

function App() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('pollo_asado_theme')
      if (saved && THEMES.includes(saved)) return saved
    } catch (err) {
      // Safari en modo privado lanza al tocar localStorage.
      console.warn('No se pudo leer el tema guardado:', err)
    }
    return DEFAULT_THEME
  })
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  // Flujo de recuperación: el link de reset dispara 'PASSWORD_RECOVERY' y crea una
  // sesión temporal. Mientras esté activo, mostramos la pantalla de cambio de clave.
  const [recovery, setRecovery] = useState(false)

  // Apply theme dynamically to the body and documentElement
  useEffect(() => {
    const safeTheme = THEMES.includes(theme) ? theme : DEFAULT_THEME
    document.body.setAttribute('data-theme', safeTheme)
    document.documentElement.setAttribute('data-theme', safeTheme)
    try {
      localStorage.setItem('pollo_asado_theme', safeTheme)
    } catch (err) {
      console.warn('No se pudo guardar el tema:', err)
    }
  }, [theme])

  // Monitor Supabase Authentication state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setLoading(false)
      })
      // Sin este catch, un fallo al leer la sesión deja la pantalla de carga
      // girando para siempre. Preferimos caer al login.
      .catch((err) => {
        console.error('No se pudo leer la sesión:', err)
        setSession(null)
        setLoading(false)
      })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (_event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(currentSession)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      // Sin red, signOut falla pero la sesión local ya no sirve: la soltamos.
      console.error('Error al cerrar sesión:', err)
      setSession(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-app text-text-primary px-6 py-12 flex flex-col items-center justify-center">
        <div className="w-full max-w-md card animate-pulse flex flex-col gap-6">
          <div className="h-6 bg-border-app rounded-full w-2/3 mx-auto"></div>
          <div className="h-4 bg-border-app rounded-full w-1/2 mx-auto"></div>
          <div className="border-b border-border-app/30 my-2"></div>
          <div className="h-12 bg-border-app rounded-2xl w-full"></div>
          <div className="h-12 bg-border-app rounded-2xl w-full"></div>
          <div className="h-12 bg-border-app rounded-2xl w-full"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-app text-text-primary flex justify-center items-start">
      {recovery ? (
        <UpdatePassword
          onDone={() => setRecovery(false)}
          onCancel={async () => { await supabase.auth.signOut(); setRecovery(false) }}
        />
      ) : !session ? (
        <Login theme={theme} setTheme={setTheme} />
      ) : (
        /* Aquí unificamos todo dentro de una sola caja contenedora */
        <div className="w-full flex flex-col gap-6">
          <Layout
            user={session.user}
            onLogout={handleLogout}
            theme={theme}
            setTheme={setTheme}
          />
        </div>
      )}
    </div>
  )
}

export default App
