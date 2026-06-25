import { useState, useMemo } from 'react'
import { useIncomes } from '../../hooks/useIncomes'
import { useSettings } from '../../hooks/useSettings'

export default function IncomeList({ user, setView, handleEdit, handleAddNew }) {
  const { settings } = useSettings()
  const baseCurrency = settings?.divisa_principal || 'CRC'

  const { incomes, loading, isSyncing } = useIncomes(user)

  const [filters, setFilters] = useState({
    month: 'all' // 'YYYY-MM' o 'all'
  })

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  if (loading) {
    return (
      <div className="w-full flex-1 flex flex-col gap-8 animate-in fade-in duration-300">
        <div className="w-full py-12 text-center text-text-secondary text-sm border border-dashed border-border-app animate-pulse">
          Cargando ingresos...
        </div>
      </div>
    )
  }

  // 1. Extraer meses disponibles
  const availableMonths = Array.from(new Set(incomes.map(inc => inc.date?.substring(0, 7)).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b)) // Ascendente

  // 2. Aplicar filtros abiertos
  let filteredIncomes = incomes
  if (filters.month !== 'all') {
    filteredIncomes = filteredIncomes.filter(inc => inc.date?.startsWith(filters.month))
  }

  // Calcular resumen del mes (suma de filteredIncomes)
  const totalAmount = filteredIncomes.reduce((sum, inc) => sum + parseFloat(inc.amount || 0), 0)

  const today = new Date().toISOString().split('T')[0]

  const pastIncomes = filteredIncomes.filter(inc => inc.date <= today)
  const futureIncomes = filteredIncomes.filter(inc => inc.date > today)

  // Ordenar pasado: el más cercano a hoy primero (descendente)
  pastIncomes.sort((a, b) => new Date(b.date) - new Date(a.date))
  // Ordenar futuro: el más cercano a hoy primero (ascendente)
  futureIncomes.sort((a, b) => new Date(a.date) - new Date(b.date))

  const renderIncomeItem = (income) => (
    <div key={income.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 bg-surface-app/30 border border-border-app hover:border-accent-app/50 transition-colors group relative">
      {income._isPendingSync && (
        <div className="absolute top-2 left-2 flex items-center justify-center" title="Pendiente de sincronizar">
          <span className="w-2 h-2 rounded-full border border-text-secondary bg-transparent"></span>
        </div>
      )}

      <div className="flex flex-col gap-1 pr-4 sm:pr-0">
        <span className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
          {income.concept}
          {income.desglose && income.desglose.length > 0 && (
            <span className="text-[9px] bg-accent-app/20 text-accent-app px-1.5 py-0.5 rounded-sm">DIVIDIDO</span>
          )}
        </span>
        <span className="text-[10px] text-text-secondary font-mono">{income.date}</span>
      </div>
      <div className="mt-2 sm:mt-0 flex items-center gap-4 sm:gap-6 justify-between sm:justify-end border-t sm:border-t-0 border-border-app/30 pt-3 sm:pt-0">
        <div className="flex flex-col items-start sm:items-end text-left sm:text-right">
          <span className="text-base font-mono text-emerald-400 font-bold tracking-tight">
            +{parseFloat(income.amount).toFixed(2)} {baseCurrency}
          </span>
          {income.category && (
            <p className="text-[10px] text-text-secondary uppercase mt-0.5">{income.category}</p>
          )}
          {income.divisa_original && income.divisa_original !== baseCurrency && (
            <p className="text-[9px] text-text-secondary font-mono mt-0.5">
              Original: {parseFloat(income.monto_original || income.amount).toFixed(2)} {income.divisa_original}
              {!income.tasa_cambio && <span className="text-amber-400 ml-1">(Pendiente)</span>}
            </p>
          )}
        </div>

        <button
          onClick={() => handleEdit(income)}
          className="p-2.5 bg-surface-app/50 border border-border-app text-text-secondary hover:text-accent-app hover:border-accent-app transition-colors cursor-pointer group-hover:bg-bg-app"
          title="Editar Ingreso"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
        </button>
      </div>
    </div>
  )

  return (
    <div className="w-full flex-1 flex flex-col gap-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-accent-app/20 pb-4">
        <div className="flex flex-col gap-1 border-l-2 border-accent-app pl-4">
          <h2 className="text-2xl md:text-3xl font-bold text-accent-app tracking-wide uppercase leading-none">Ingresos</h2>
          <div className="flex items-center gap-2">
            <p className="text-xs md:text-sm text-text-secondary">
              Historial de entradas de dinero.
            </p>
            {isSyncing && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono animate-pulse">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                SYNCING
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-accent-app text-bg-app font-bold text-xs md:text-sm px-6 py-2.5 hover:opacity-90 transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2 uppercase tracking-wider"
        >
          <span>+</span> Nuevo Ingreso
        </button>
      </div>

      {incomes.length === 0 ? (
        <div className="w-full py-12 text-center text-text-secondary text-sm border border-dashed border-border-app">
          Aún no hay ingresos registrados.
        </div>
      ) : (
        <div className="w-full flex flex-col gap-6">

          {/* BARRA DE FILTROS & RESUMEN */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-surface-app/20 p-4 border border-border-app">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Filtros:</span>

              <div className="relative">
                <select
                  name="month"
                  value={filters.month}
                  onChange={handleFilterChange}
                  className="bg-bg-app border border-border-app py-2 pl-3 pr-8 text-xs font-semibold text-text-primary focus:outline-none focus:border-accent-app appearance-none cursor-pointer min-w-[160px] uppercase tracking-wider"
                >
                  <option value="all">Todos los meses</option>
                  {availableMonths.map(m => {
                    const [year, month] = m.split('-')
                    const date = new Date(year, month - 1, 1)
                    const name = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
                    return <option key={m} value={m}>{name}</option>
                  })}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-text-secondary">▼</div>
              </div>
            </div>

            {/* RESUMEN DEL MES */}
            <div className="flex flex-col items-end border-l-0 md:border-l border-border-app pl-0 md:pl-6 pt-4 md:pt-0 w-full md:w-auto border-t md:border-t-0 mt-2 md:mt-0">
              <span className="text-[10px] text-text-secondary uppercase tracking-wider">Total Acumulado</span>
              <span className="text-xl font-mono font-bold text-emerald-400">
                +{totalAmount.toFixed(2)} {baseCurrency}
              </span>
            </div>
          </div>

          {futureIncomes.length === 0 && pastIncomes.length === 0 && (
            <div className="w-full py-12 text-center text-text-secondary text-sm border border-dashed border-border-app">
              No hay ingresos que coincidan con estos filtros.
            </div>
          )}

          {futureIncomes.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-accent-app uppercase tracking-wider mb-2 border-b border-border-app pb-2">Proyecciones</h3>
              {futureIncomes.map(renderIncomeItem)}
            </div>
          )}

          {pastIncomes.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-accent-app uppercase tracking-wider mb-2 border-b border-border-app pb-2">Historial</h3>
              {pastIncomes.map(renderIncomeItem)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
