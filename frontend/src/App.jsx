import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [theme, setTheme] = useState('slate')

  // Apply theme dynamically to the body element
  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
  }, [theme])

  // Mock initial data for visual validation
  const savingGoals = [
    { id: 1, name: 'Fondo de Emergencia', target: 5000, current: 1500, type: 'propósito' },
    { id: 2, name: 'Viaje a Japón', target: 3000, current: 600, type: 'deseo' }
  ]

  const budgets = [
    { id: 1, category: 'Comida', limit: 400, spent: 180 },
    { id: 2, category: 'Transporte', limit: 150, spent: 45 }
  ]

  return (
    <main className="min-h-screen bg-bg-app text-text-primary px-6 py-12 flex flex-col items-center">
      {/* Header Section */}
      <header className="w-full max-w-4xl mb-12 flex flex-col md:flex-row md:items-center md:justify-between border-b border-border-app pb-6 gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">PolloAsado</h1>
          <p className="text-sm text-text-secondary mt-1">Gestor de finanzas personales minimalista y alineación de metas.</p>
        </div>

        {/* Theme Picker */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Paleta de color</span>
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
                className={`w-7 h-7 rounded-full border ${t.color} cursor-pointer transition-transform duration-100 ${
                  theme === t.id ? 'scale-110 border-text-primary' : 'border-border-app hover:scale-105'
                }`}
                title={t.name}
                aria-label={`Cambiar a tema ${t.name}`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Content Grid */}
      <section className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Column 1: Ahorros (Propósitos y Deseos) */}
        <div className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold text-accent-app tracking-wide uppercase border-b border-border-app pb-2">
            Ahorros (Propósitos y Deseos)
          </h2>
          
          <div className="flex flex-col gap-4">
            {savingGoals.map((goal) => {
              const percentage = Math.min(100, Math.round((goal.current / goal.target) * 100))
              return (
                <div key={goal.id} className="bg-surface-app border border-border-app p-5 rounded-none flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-text-primary text-base">{goal.name}</h3>
                      <span className="text-xs text-text-secondary capitalize font-mono">{goal.type}</span>
                    </div>
                    <span className="text-sm font-mono text-text-primary">${goal.current} / ${goal.target}</span>
                  </div>
                  
                  {/* Flat progress bar */}
                  <div className="w-full h-1 bg-border-app rounded-none overflow-hidden">
                    <div 
                      className="h-full bg-accent-app transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-secondary font-mono self-end">{percentage}% completado</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Column 2: Presupuestos (Límites) */}
        <div className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold text-accent-app tracking-wide uppercase border-b border-border-app pb-2">
            Presupuestos (Límites)
          </h2>

          <div className="flex flex-col gap-4">
            {budgets.map((budget) => {
              const percentage = Math.min(100, Math.round((budget.spent / budget.limit) * 100))
              return (
                <div key={budget.id} className="bg-surface-app border border-border-app p-5 rounded-none flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-text-primary text-base">{budget.category}</h3>
                    <span className="text-sm font-mono text-text-primary">${budget.spent} / ${budget.limit}</span>
                  </div>

                  {/* Flat progress bar */}
                  <div className="w-full h-1 bg-border-app rounded-none overflow-hidden">
                    <div 
                      className="h-full bg-accent-app transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-text-secondary font-mono">
                    <span>Límite de categoría</span>
                    <span>{percentage}% consumido</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </section>
      
      {/* Footer */}
      <footer className="w-full max-w-4xl mt-16 pt-6 border-t border-border-app text-center text-xs text-text-secondary font-mono">
        PolloAsado © 2026. Diseñado bajo directrices impecables y minimalistas.
      </footer>
    </main>
  )
}

export default App
