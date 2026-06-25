import { useState } from 'react'

export default function Layout({ user, onLogout, theme, setTheme }) {
  const tabs = [
    { id: 'overview', name: 'Resumen' },
    { id: 'income', name: 'Ingresos' },
    { id: 'expenses', name: 'Gastos' },
    { id: 'savings', name: 'Ahorros' },
    { id: 'budgets', name: 'Presupuestos' },
    { id: 'debts', name: 'Deudas' }
  ]

  const [activeTab, setActiveTab] = useState('overview')

  const activeTabName = tabs.find((t) => t.id === activeTab)?.name || ''

  const themeOptions = [
    { id: 'slate', name: 'Gris', color: 'bg-slate-400' },
    { id: 'emerald', name: 'Verde', color: 'bg-emerald-400' },
    { id: 'sky', name: 'Azul', color: 'bg-sky-400' },
    { id: 'amber', name: 'Oro', color: 'bg-amber-400' },
    { id: 'rose', name: 'Rosa', color: 'bg-rose-500' }
  ]

  return (
    <div className="w-full min-h-screen bg-bg-app text-text-primary flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex flex-col gap-4 p-5 border-b border-accent-app/30 bg-bg-app z-40 sticky top-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-accent-app">PolloAsado</h1>
          <button
            onClick={onLogout}
            className="border border-accent-app/30 hover:bg-surface-app text-text-secondary hover:text-text-primary text-[10px] font-semibold py-1.5 px-3 transition-all duration-150 active:scale-[0.98] cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>

        <div className="flex items-center justify-between">
          {user && (
            <p className="text-[10px] text-text-secondary">
              <span className="font-mono text-text-primary font-semibold">{user.user_metadata?.nombre || user.email}</span>
            </p>
          )}
          <div className="flex gap-2">
            {themeOptions.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`w-4 h-4 rounded-full border ${t.color} cursor-pointer transition-transform duration-100 ${theme === t.id ? 'scale-110 border-text-primary' : 'border-border-app hover:scale-105'
                  }`}
                title={t.name}
                aria-label={`Cambiar a tema ${t.name}`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 lg:w-72 flex-col border-r border-accent-app/30 p-6 gap-8 bg-surface-app/10 h-screen sticky top-0 overflow-y-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-accent-app">PolloAsado</h1>
          {user && (
            <p className="text-xs text-text-secondary mt-1">
              Sesión iniciada como <br />
              <span className="font-mono text-text-primary font-semibold truncate block mt-0.5" title={user.user_metadata?.nombre || user.email}>
                {user.user_metadata?.nombre || user.email}
              </span>
            </p>
          )}
        </div>

        <nav className="flex flex-col gap-2 flex-1 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-left px-4 py-3.5 text-xs lg:text-sm font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer rounded-sm ${activeTab === tab.id
                  ? 'text-bg-app bg-accent-app font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-app/60'
                }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>

        {/* Controls at the bottom of sidebar */}
        <div className="flex flex-col gap-6 mt-auto pt-6 border-t border-accent-app/30">
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Paleta de color</span>
            <div className="flex flex-wrap gap-2.5">
              {themeOptions.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`w-6 h-6 rounded-full border ${t.color} cursor-pointer transition-transform duration-100 ${theme === t.id ? 'scale-110 border-text-primary' : 'border-border-app hover:scale-105'
                    }`}
                  title={t.name}
                  aria-label={`Cambiar a tema ${t.name}`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full border border-accent-app/30 hover:bg-surface-app text-text-secondary hover:text-text-primary text-xs font-semibold py-3 px-3 transition-all duration-150 active:scale-[0.98] cursor-pointer text-center"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-[72px] md:pb-0">
        <div className="w-full max-w-[1600px] mx-auto p-5 md:p-8 lg:p-12 flex-1 flex flex-col">

          <div className="w-full flex-1 border border-dashed border-accent-app/30 bg-surface-app/10 p-8 md:p-12 text-center flex flex-col items-center justify-center min-h-[400px] rounded-sm">
            <div className="max-w-xl flex flex-col gap-3">
              <h2 className="text-2xl md:text-3xl font-bold text-accent-app tracking-wide uppercase">
                {activeTabName}
              </h2>
              <p className="text-sm md:text-base text-text-primary font-medium mt-2">
                Contenido vacío para futura referencia
              </p>
              <p className="text-xs md:text-sm text-text-secondary mt-2 leading-relaxed max-w-md mx-auto">
                Este espacio está reservado para la interfaz interactiva de <span className="font-semibold text-text-primary">{activeTabName}</span>. Los componentes y vistas correspondientes usarán todo el ancho disponible.
              </p>
            </div>
          </div>

          {/* Minimal Footer */}
          <footer className="w-full mt-10 pt-6 border-t border-accent-app/20 text-center text-[10px] text-text-secondary font-mono">
            PolloAsado © 2026. Diseñado bajo directrices impecables y minimalistas.
          </footer>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-bg-app/95 backdrop-blur-md border-t border-accent-app/30 flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] z-50">
        <div className="flex w-full min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[90px] py-4 px-2 text-[10px] font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer text-center ${activeTab === tab.id
                  ? 'text-bg-app bg-accent-app font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-app/50'
                }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
