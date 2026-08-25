import { useState } from 'react'
import Income from './Income'
import Outcome from './Outcome'
import Settings from './Settings'
import Budget from './Budget'
import Savings from './Savings'
import Import from './Import'
import DebtForm from './Debt/DebtForm'
import DebtAnalysis from './Debt/DebtAnalysis'
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Target,
  CreditCard,
  Settings as SettingsIcon,
  LogOut,
  Upload
} from 'lucide-react'

import polloSvg from '../assets/pollo.svg'
import Dashboard from './Dashboard'

export default function Layout({ user, onLogout, theme, setTheme }) {
  const tabs = [
    { id: 'dashboard', name: 'Inicio', icon: LayoutDashboard },
    { id: 'income', name: 'Ingresos', icon: TrendingUp },
    { id: 'expenses', name: 'Gastos', icon: TrendingDown },
    { id: 'import', name: 'Importar', icon: Upload },
    { id: 'savings', name: 'Ahorros', icon: PiggyBank },
    { id: 'budgets', name: 'Presupuestos', icon: Target },
    { id: 'debts', name: 'Deudas', icon: CreditCard },
    { id: 'settings', name: 'Ajustes', icon: SettingsIcon }
  ]

  // La pestaña sobrevive a un recargo (o a que el navegador descarte la pestaña
  // en el celular). Si el valor guardado ya no existe, caemos al inicio.
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = sessionStorage.getItem('polloasado_active_tab')
      if (saved && tabs.some((t) => t.id === saved)) return saved
    } catch (err) {
      console.warn('No se pudo leer la pestaña guardada:', err)
    }
    return 'dashboard'
  })

  const selectTab = (id) => {
    setActiveTab(id)
    try {
      sessionStorage.setItem('polloasado_active_tab', id)
    } catch (err) {
      console.warn('No se pudo guardar la pestaña activa:', err)
    }
  }

  const [debtPreview, setDebtPreview] = useState({ amount: '', due_date: '' })  //se guarda la informacion mientras el usuario ingresa los datos
  const activeTabName = tabs.find((t) => t.id === activeTab)?.name || ''

  // 🛠️ FUNCIONES ESTABLES PARA EVITAR EL BUCLE INFINITO DE RENDERS
  // Deudas todavía no persiste nada: el formulario solo alimenta el análisis en
  // pantalla. Se dice en la UI en vez de fingir un guardado.
  const handleCancelDebt = () => setDebtPreview({ amount: '', due_date: '' });
  const handleSaveDebt = (datos) => setDebtPreview(datos);
  const handlePreviewDebt = (datos) => setDebtPreview(datos);

  return (
    <div className="w-full min-h-screen bg-bg-app text-text-primary flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-5 border-b border-border-app/30 bg-bg-app z-40 sticky top-0">
        <div className="flex items-center gap-2">
          <img src={polloSvg} alt="PolloAsado Logo" className="w-6 h-6" />
          <h1 className="text-xl font-bold text-accent-app">PolloAsado</h1>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 p-2 rounded-xl border border-border-app/50 hover:bg-surface-app text-text-secondary hover:text-text-primary text-xs font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 lg:w-72 flex-col border-r border-border-app/30 p-6 gap-8 bg-surface-app/20 h-screen sticky top-0 overflow-y-auto">
        <div className="flex items-center gap-3">
          <img src={polloSvg} alt="PolloAsado Logo" className="w-8 h-8" />
          <h1 className="text-3xl font-bold text-accent-app">PolloAsado</h1>
        </div>

        <nav className="flex flex-col gap-2 flex-1 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`text-left px-4 py-3.5 text-sm font-semibold transition-all duration-150 cursor-pointer rounded-2xl flex items-center gap-3 ${activeTab === tab.id
                ? 'text-bg-app bg-accent-app shadow-lg'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-app/80'
                }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-bg-app' : 'text-accent-app opacity-80'}`} />
              {tab.name}
            </button>
          ))}
        </nav>

        {/* Controls at the bottom of sidebar */}
        <div className="mt-auto pt-6 border-t border-border-app/30">
          <button
            onClick={onLogout}
            className="btn-secondary w-full"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-0">
        <div className="w-full max-w-[1600px] mx-auto p-5 md:p-8 lg:p-12 flex-1 flex flex-col">
          {activeTab === 'dashboard' ? (
            <Dashboard user={user} />
          ) : activeTab === 'income' ? (
            <Income user={user} />
          ) : activeTab === 'expenses' ? (
            <Outcome user={user} />
          ) : activeTab === 'import' ? (
            <Import user={user} />
          ) : activeTab === 'savings' ? (
            <Savings user={user} />
          ) : activeTab === 'budgets' ? (
            <Budget user={user} />
          ) : activeTab === 'settings' ? (
            <Settings user={user} onLogout={onLogout} theme={theme} setTheme={setTheme} />
          ) : activeTab === 'debts' ? (
            <div className="flex flex-col gap-6">
              <p className="notice-warning" role="status">
                Deudas es una vista previa: lo que escribás alimenta el cálculo en pantalla, pero no se guarda. Al recargar se pierde.
              </p>
              {/* 🛠️ USANDO LAS FUNCIONES DE REFERENCIA FIJA */}
              <DebtForm
                user={user}
                onCancel={handleCancelDebt}
                onSave={handleSaveDebt}
                onPreview={handlePreviewDebt}
              />
              <DebtAnalysis
                amount={debtPreview.amount}
                due_date={debtPreview.due_date}
                ingresoMensual={3000}
              />
            </div>
          ) : (
            <div className="w-full flex-1 card flex flex-col items-center justify-center min-h-[400px] text-center border-dashed">
              <div className="max-w-xl flex flex-col gap-4 items-center">
                <h2 className="heading text-3xl">
                  {activeTabName}
                </h2>
                <p className="text-text-secondary">
                  Esta sección todavía no está hecha. Por ahora podés usar Ingresos y Gastos.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-bg-app/95 backdrop-blur-md border-t border-border-app/30 shadow-lg flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] z-50">
        <div className="flex items-stretch overflow-x-auto hide-scrollbar gap-1.5 px-2.5 py-2 w-full justify-evenly">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`flex-shrink-0 min-w-[4.5rem] flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-2xl transition-all duration-150 cursor-pointer ${activeTab === tab.id
                ? 'text-bg-app bg-accent-app shadow-lg'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-app/60'
                }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-bg-app' : 'text-accent-app opacity-80'}`} />
              <span className="text-xs font-medium leading-tight whitespace-nowrap">{tab.name}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}