import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './components/Login'
import UpdatePassword from './components/UpdatePassword'
import Layout from './components/Layout'
import './App.css'
import DebtForm from './components/Debt/DebtForm'

function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pollo_asado_theme') || 'slate'
    }
    return 'slate'
  })
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  // Flujo de recuperación: el link de reset dispara 'PASSWORD_RECOVERY' y crea una
  // sesión temporal. Mientras esté activo, mostramos la pantalla de cambio de clave.
  const [recovery, setRecovery] = useState(false)

  // Apply theme dynamically to the body and documentElement
  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('pollo_asado_theme', theme)
  }, [theme])

  // Monitor Supabase Authentication state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
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
    await supabase.auth.signOut()
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
