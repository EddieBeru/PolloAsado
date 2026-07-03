import { useState } from 'react'
import Income from './Income'
import Outcome from './Outcome'
import Settings from './Settings'
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
  Palette
} from 'lucide-react'

import polloSvg from '../assets/pollo.svg'

export default function Layout({ user, onLogout, theme, setTheme }) {
  const tabs = [
    { id: 'overview', name: 'Inicio', icon: LayoutDashboard },
    { id: 'income', name: 'Ingresos', icon: TrendingUp },
    { id: 'expenses', name: 'Gastos', icon: TrendingDown },
    { id: 'savings', name: 'Ahorros', icon: PiggyBank },
    { id: 'budgets', name: 'Presupuestos', icon: Target },
    { id: 'debts', name: 'Deudas', icon: CreditCard },
    { id: 'settings', name: 'Ajustes', icon: SettingsIcon }
  ]

  const [activeTab, setActiveTab] = useState('overview')
  const [debtPreview, setDebtPreview] = useState({ amount: '', due_date: '' })  //se guarda la informacion mientras el usuario ingresa los datos 
  const activeTabName = tabs.find((t) => t.id === activeTab)?.name || ''

  const themeOptions = [
    { id: 'slate', name: 'Gris', color: 'bg-slate-400' },
    { id: 'emerald', name: 'Verde', color: 'bg-emerald-400' },
    { id: 'sky', name: 'Azul', color: 'bg-sky-400' },
    { id: 'amber', name: 'Oro', color: 'bg-amber-400' },
    { id: 'rose', name: 'Rosa', color: 'bg-rose-500' }
  ]

  // 🛠️ FUNCIONES ESTABLES PARA EVITAR EL BUCLE INFINITO DE RENDERS
  const handleCancelDebt = () => alert("Simulación: Formulario Cerrado");
  const handleSaveDebt = (datos) => console.log("Guardar en Supabase:", datos);
  const handlePreviewDebt = (datos) => setDebtPreview(datos);

  return (
    <div className="w-full min-h-screen bg-bg-app text-text-primary flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex flex-col gap-4 p-5 border-b border-border-app/30 bg-bg-app z-40 sticky top-0">
        <div className="flex items-center justify-between">
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
        </div>

        <div className="flex items-center justify-between">
          {user && (
            <p className="text-xs text-text-secondary">
              <span className="font-mono text-text-primary font-semibold">{user.user_metadata?.nombre || user.email}</span>
            </p>
          )}
          <div className="flex gap-2">
            {themeOptions.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`w-5 h-5 rounded-full border-2 ${t.color} cursor-pointer transition-transform duration-100 ${theme === t.id ? 'scale-110 border-text-primary' : 'border-transparent hover:scale-105'
                  }`}
                title={t.name}
                aria-label={`Cambiar a tema ${t.name}`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 lg:w-72 flex-col border-r border-border-app/30 p-6 gap-8 bg-surface-app/20 h-screen sticky top-0 overflow-y-auto">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 mb-2">
            <img src={polloSvg} alt="PolloAsado Logo" className="w-8 h-8" />
            <h1 className="text-3xl font-bold text-accent-app">PolloAsado</h1>
          </div>
          {user && (
            <p className="text-xs text-text-secondary mt-1">
              <span className="text-text-primary font-semibold truncate block mt-0.5" title={user.user_metadata?.nombre || user.email}>
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
              className={`text-left px-4 py-3.5 text-sm font-semibold transition-all duration-150 cursor-pointer rounded-2xl flex items-center gap-3 ${activeTab === tab.id
                ? 'text-bg-app bg-accent-app shadow-md'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-app/80'
                }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-bg-app' : 'text-accent-app opacity-80'}`} />
              {tab.name}
            </button>
          ))}
        </nav>

        {/* Controls at the bottom of sidebar */}
        <div className="flex flex-col gap-6 mt-auto pt-6 border-t border-border-app/30">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2.5">
              {themeOptions.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`w-6 h-6 rounded-full border-2 ${t.color} cursor-pointer transition-transform duration-100 ${theme === t.id ? 'scale-110 border-text-primary' : 'border-transparent hover:scale-105'
                    }`}
                  title={t.name}
                  aria-label={`Cambiar a tema ${t.name}`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={onLogout}
            className="btn-secondary w-full"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-[72px] md:pb-0">
        <div className="w-full max-w-[1600px] mx-auto p-5 md:p-8 lg:p-12 flex-1 flex flex-col">
          {activeTab === 'income' ? (
            <Income user={user} />
          ) : activeTab === 'expenses' ? (
            <Outcome user={user} />
          ) : activeTab === 'settings' ? (
            <Settings user={user} onLogout={onLogout} />
          ) : activeTab === 'debts' ? (
            <div className="flex flex-col gap-6">
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
                  Contenido vacío.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-bg-app/95 backdrop-blur-md border-t border-border-app/30 flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] z-50">
        <div className="flex items-center overflow-x-auto hide-scrollbar gap-2 px-3 py-2 w-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap flex-1 justify-center px-4 py-3 text-[11px] font-semibold transition-all duration-150 cursor-pointer rounded-2xl flex items-center gap-2 ${activeTab === tab.id
                ? 'text-bg-app bg-accent-app shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
                }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-bg-app' : 'text-accent-app opacity-80'}`} />
              <span className="hidden sm:inline">{tab.name}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}