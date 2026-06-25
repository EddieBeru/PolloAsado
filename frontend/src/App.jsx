import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './components/Login'
import Layout from './components/Layout'
import './App.css'

function App() {
  const [theme, setTheme] = useState('slate')
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // Apply theme dynamically to the body element
  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
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

  // Minimalist Skeleton screen loader matching the app's flat, dark-mode style
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-app text-text-primary px-6 py-12 flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-surface-app border border-border-app p-8 flex flex-col gap-6 animate-pulse">
          <div className="h-6 bg-border-app w-2/3 mx-auto"></div>
          <div className="h-4 bg-border-app w-1/2 mx-auto"></div>
          <div className="border-b border-border-app my-2"></div>
          <div className="h-10 bg-border-app w-full"></div>
          <div className="h-10 bg-border-app w-full"></div>
          <div className="h-10 bg-border-app w-full"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-app text-text-primary flex justify-center items-start pt-12 pb-12">
      {!session ? (
        <Login />
      ) : (
        <Layout
          user={session.user}
          onLogout={handleLogout}
          theme={theme}
          setTheme={setTheme}
        />
      )}
    </div>
  )
}

export default App

