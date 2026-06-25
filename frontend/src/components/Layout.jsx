import { useState } from 'react'

export default function Layout({ user, onLogout, theme, setTheme }) {
  const tabs = [
    { id: 'overview', name: 'Resumen' },
    { id: 'income', name: 'Ingresos' },
    { id: 'expenses', name: 'Gastos' },
    { id: 'savings', name: 'Ahorros / Deseos' },
    { id: 'budgets', name: 'Presupuestos' },
    { id: 'debts', name: 'Deudas' }
  ]

  const [activeTab, setActiveTab] = useState('overview')

  const activeTabName = tabs.find((t) => t.id === activeTab)?.name || ''

  return (
    <div className="w-full max-w-5xl min-h-screen flex flex-col bg-bg-app text-text-primary px-6 py-8">
      {/* Top Header */}
      <header className="w-full mb-8 flex flex-col md:flex-row md:items-center md:justify-between border-b border-border-app pb-6 gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">PolloAsado</h1>
          {user && (
            <p className="text-xs text-text-secondary">
              Sesión iniciada como <span className="font-mono text-text-primary font-semibold">{user.user_metadata?.nombre || user.email}</span>
            </p>
          )}
        </div>

        {/* Header Right Controls */}
        <div className="flex flex-wrap items-center gap-6">
          {/* Theme Picker */}
          <div className="flex flex-col gap-2">
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
                  className={`w-6 h-6 rounded-full border ${t.color} cursor-pointer transition-transform duration-100 ${
                    theme === t.id ? 'scale-110 border-text-primary' : 'border-border-app hover:scale-105'
                  }`}
                  title={t.name}
                  aria-label={`Cambiar a tema ${t.name}`}
                />
              ))}
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="border border-border-app hover:bg-surface-app text-text-secondary hover:text-text-primary text-xs font-semibold py-2 px-3 transition-all duration-150 active:scale-[0.98] cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="w-full border-b border-border-app mb-8 overflow-x-auto scrollbar-none">
        <div className="flex gap-6 pb-2 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2 text-sm font-medium tracking-wide transition-all duration-150 cursor-pointer border-b-2 ${
                activeTab === tab.id
                  ? 'text-accent-app border-accent-app font-semibold'
                  : 'text-text-secondary border-transparent hover:text-text-primary'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content Area - Empty placeholder as requested */}
      <main className="flex-1 flex flex-col">
        <div className="w-full border border-dashed border-border-app bg-surface-app/30 p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
          <div className="max-w-md flex flex-col gap-2">
            <h2 className="text-base font-semibold text-accent-app tracking-wide uppercase">
              {activeTabName}
            </h2>
            <p className="text-sm text-text-primary font-medium mt-1">
              Contenido vacío para futura referencia
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Este espacio está reservado para la interfaz interactiva de {activeTabName}. Los componentes y vistas correspondientes serán renderizados aquí en futuras integraciones.
            </p>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full mt-12 pt-6 border-t border-border-app text-center text-[10px] text-text-secondary font-mono">
        PolloAsado © 2026. Diseñado bajo directrices impecables y minimalistas.
      </footer>
    </div>
  )
}
