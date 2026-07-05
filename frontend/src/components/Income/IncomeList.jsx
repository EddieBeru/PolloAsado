import { useState, useEffect } from 'react'
import { useIncomes } from '../../hooks/useIncomes'
import { useSettings } from '../../hooks/useSettings'
import { fetchRangeTotals } from '../../lib/stats'

export default function IncomeList({ user, setView, handleEdit, handleAddNew }) {
  const { settings } = useSettings()
  const baseCurrency = settings?.divisa_principal || 'CRC'

  const { incomes, loading, isSyncing, loadMore } = useIncomes(user)

  const [filters, setFilters] = useState(() => {
    const savedFilters = sessionStorage.getItem('polloasado_income_filters')
    return savedFilters ? JSON.parse(savedFilters) : { month: 'all' }
  })

  const handleFilterChange = (e) => {
    setFilters(prev => {
      const newFilters = { ...prev, [e.target.name]: e.target.value }
      sessionStorage.setItem('polloasado_income_filters', JSON.stringify(newFilters))
      return newFilters
    })
  }

  // Total autoritativo del mes seleccionado vía RPC (independiente de la ventana
  // cargada). En 'all' usamos la suma local del set cargado.
  const [monthTotal, setMonthTotal] = useState(null)
  useEffect(() => {
    if (filters.month === 'all') { setMonthTotal(null); return }
    let active = true
    const [y, m] = filters.month.split('-')
    const start = `${filters.month}-01`
    const lastDay = new Date(Number(y), Number(m), 0).getDate()
    const end = `${filters.month}-${String(lastDay).padStart(2, '0')}`
    fetchRangeTotals({ start, end })
      .then(r => { if (active) setMonthTotal(r.totalIngresos) })
      .catch(() => { if (active) setMonthTotal(null) })
    return () => { active = false }
  }, [filters.month])

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

  // Resumen: en 'all' sumamos el set cargado; en un mes usamos el total del RPC.
  const loadedTotal = filteredIncomes.reduce((sum, inc) => sum + parseFloat(inc.amount || 0), 0)
  const totalAmount = filters.month === 'all' ? loadedTotal : (monthTotal ?? loadedTotal)

  const today = new Date().toISOString().split('T')[0]

  const pastIncomes = filteredIncomes.filter(inc => inc.date <= today)
  const futureIncomes = filteredIncomes.filter(inc => inc.date > today)

  // Ordenar pasado: el más cercano a hoy primero (descendente)
  pastIncomes.sort((a, b) => new Date(b.date) - new Date(a.date))
  // Ordenar futuro: el más cercano a hoy primero (ascendente)
  futureIncomes.sort((a, b) => new Date(a.date) - new Date(b.date))

  const renderIncomeItem = (income) => (
    <div key={income.id} className="bg-surface-app rounded-2xl border border-border-app/50 p-4 md:p-5 hover:-translate-y-0.5 hover:shadow-lg hover:border-accent-app/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between group relative">
      {income._isPendingSync && (
        <div className="absolute top-3 left-3 flex items-center justify-center" title="Pendiente de sincronizar">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-text-secondary bg-transparent"></span>
        </div>
      )}

      <div className="flex flex-col gap-1 pr-4 sm:pr-0 pl-4 sm:pl-0">
        <span className="text-base font-semibold text-text-primary flex items-center gap-2">
          {income.concept}
          {income.desglose && income.desglose.length > 0 && (
            <span className="text-[10px] bg-accent-app/20 text-accent-app px-2 py-0.5 rounded-full font-bold">DIVIDIDO</span>
          )}
        </span>
        <span className="text-xs text-text-secondary">{income.date}</span>
      </div>
      <div className="mt-3 sm:mt-0 flex items-center gap-4 sm:gap-6 justify-between sm:justify-end border-t sm:border-t-0 border-border-app/30 pt-3 sm:pt-0">
        <div className="flex flex-col items-start sm:items-end text-left sm:text-right">
          <span className="text-lg font-mono text-emerald-400 font-bold tracking-tight">
            +{parseFloat(income.amount).toFixed(2)} {baseCurrency}
          </span>
          {income.category && (
            <span className="text-xs text-text-secondary bg-bg-app px-2 py-0.5 rounded-full mt-1">{income.category}</span>
          )}
          {income.divisa_original && income.divisa_original !== baseCurrency && (
            <p className="text-[10px] text-text-secondary font-mono mt-1">
              Original: {parseFloat(income.monto_original || income.amount).toFixed(2)} {income.divisa_original}
              {!income.tasa_cambio && <span className="text-amber-400 ml-1">(Pendiente)</span>}
            </p>
          )}
        </div>

        <button
          onClick={() => handleEdit(income)}
          className="btn-icon"
          title="Editar Ingreso"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
        </button>
      </div>
    </div>
  )

  return (
    <div className="w-full flex-1 flex flex-col gap-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h2 className="heading">Ingresos</h2>
            {isSyncing && (
              <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full font-mono animate-pulse">
                <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                Sincronizando
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary">
            Historial de entradas de dinero.
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="btn-primary"
        >
          <span>+</span> Nuevo Ingreso
        </button>
      </div>

      {incomes.length === 0 ? (
        <div className="card w-full py-16 text-center text-text-secondary text-sm">
          Aún no hay ingresos registrados.
        </div>
      ) : (
        <div className="w-full flex flex-col gap-6">

          {/* BARRA DE FILTROS & RESUMEN */}
          <div className="card flex flex-col md:flex-row gap-4 items-start md:items-center justify-between !p-4 !md:p-5">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-semibold text-text-secondary">Mes:</span>
              <div className="relative">
                <select
                  name="month"
                  value={filters.month}
                  onChange={handleFilterChange}
                  className="input !py-2 !w-auto cursor-pointer font-semibold capitalize"
                >
                  <option value="all">Todos los meses</option>
                  {availableMonths.map(m => {
                    const [year, month] = m.split('-')
                    const date = new Date(year, month - 1, 1)
                    const name = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
                    return <option key={m} value={m}>{name}</option>
                  })}
                </select>
              </div>
            </div>

            {/* RESUMEN DEL MES */}
            <div className="flex flex-col items-end border-t md:border-t-0 md:border-l border-border-app/30 pt-4 md:pt-0 pl-0 md:pl-6 w-full md:w-auto">
              <span className="text-xs text-text-secondary font-semibold">Total Acumulado</span>
              <span className="text-xl font-mono font-bold text-emerald-400">
                +{totalAmount.toFixed(2)} {baseCurrency}
              </span>
            </div>
          </div>

          {futureIncomes.length === 0 && pastIncomes.length === 0 && (
            <div className="card w-full py-16 text-center text-text-secondary text-sm">
              No hay ingresos que coincidan con estos filtros.
            </div>
          )}

          {futureIncomes.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-bold text-text-primary ml-1">Proyecciones</h3>
              {futureIncomes.map(renderIncomeItem)}
            </div>
          )}

          {pastIncomes.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-bold text-text-primary ml-1">Historial</h3>
              {pastIncomes.map(renderIncomeItem)}
            </div>
          )}

          {filters.month === 'all' && (
            <button
              onClick={loadMore}
              className="btn-secondary self-center mt-2"
            >
              Cargar meses anteriores
            </button>
          )}
        </div>
      )}
    </div>
  )
}
