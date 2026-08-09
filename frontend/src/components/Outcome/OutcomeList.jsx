import { useState, useEffect } from 'react'
import { useOutcomes } from '../../hooks/useOutcomes'
import { useSettings } from '../../hooks/useSettings'
import { fetchRangeTotals } from '../../lib/stats'
import { formatMoney, formatDate, formatMonth, toNumber } from '../../lib/format'

// Mes actual en formato 'YYYY-MM' (hora local).
const currentMonth = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function OutcomeList({ user, setView, handleEdit, handleAddNew }) {
    const { settings } = useSettings()
    const baseCurrency = settings?.divisa_principal || 'CRC'

    const { outcomes, loading, isSyncing, syncError, loadMore, loadingMore, hasMore } = useOutcomes(user)

    // sessionStorage puede estar bloqueado (modo privado) o traer JSON corrupto
    // de una versión anterior: nunca debe tumbar la pantalla.
    const [filters, setFilters] = useState(() => {
        try {
            const savedFilters = sessionStorage.getItem('polloasado_outcome_filters')
            const parsed = savedFilters ? JSON.parse(savedFilters) : null
            if (parsed && typeof parsed.month === 'string') return parsed
        } catch (err) {
            console.warn('Filtros guardados ilegibles, usando los de por defecto:', err)
        }
        return { month: currentMonth() }
    })

    const handleFilterChange = (e) => {
        setFilters(prev => {
            const newFilters = { ...prev, [e.target.name]: e.target.value }
            try {
                sessionStorage.setItem('polloasado_outcome_filters', JSON.stringify(newFilters))
            } catch (err) {
                console.warn('No se pudieron guardar los filtros:', err)
            }
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
        setMonthTotal(null)
        fetchRangeTotals({ start, end })
            .then(r => { if (active) setMonthTotal(r.totalGastos) })
            .catch(err => {
                console.error('No se pudo traer el total del mes:', err)
                if (active) setMonthTotal(null)
            })
        return () => { active = false }
    }, [filters.month])

    if (loading) {
        return (
            <div className="w-full flex-1 flex flex-col gap-6" aria-busy="true">
                <div className="skeleton h-8 w-40" />
                <div className="flex flex-col gap-4">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="skeleton h-20 w-full" />
                    ))}
                </div>
                <span className="sr-only">Cargando gastos…</span>
            </div>
        )
    }

    // 1. Extraer meses disponibles
    // El mes actual siempre está disponible, aunque todavía no tenga gastos.
    const availableMonths = Array.from(new Set([currentMonth(), ...outcomes.map(inc => inc.date?.substring(0, 7)).filter(Boolean)]))
        .sort((a, b) => a.localeCompare(b)) // Ascendente

    // 2. Aplicar filtros abiertos
    let filteredOutcomes = outcomes
    if (filters.month !== 'all') {
        filteredOutcomes = filteredOutcomes.filter(inc => inc.date?.startsWith(filters.month))
    }

    // Resumen: en 'all' sumamos el set cargado; en un mes usamos el total del RPC.
    const loadedTotal = filteredOutcomes.reduce((sum, inc) => sum + toNumber(inc.amount), 0)
    // Si el RPC del mes no respondió, lo que mostramos es solo lo cargado en la
    // ventana local: se etiqueta distinto para no leerse como un total autoritativo.
    const usingLocalTotal = filters.month === 'all' || monthTotal === null
    const totalAmount = usingLocalTotal ? loadedTotal : monthTotal

    const today = new Date().toISOString().split('T')[0]

    const pastOutcomes = filteredOutcomes.filter(inc => inc.date <= today)
    const futureOutcomes = filteredOutcomes.filter(inc => inc.date > today)

    // Ordenar pasado: el más cercano a hoy primero (descendente)
    pastOutcomes.sort((a, b) => new Date(b.date) - new Date(a.date))
    // Ordenar futuro: el más cercano a hoy primero (ascendente)
    futureOutcomes.sort((a, b) => new Date(a.date) - new Date(b.date))

    const renderOutcomeItem = (outcome) => (
        <div key={outcome.id} className="bg-surface-app rounded-2xl border border-border-app/50 p-4 md:p-5 hover:-translate-y-0.5 hover:shadow-lg hover:border-accent-app/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between group relative">
            {outcome._isPendingSync && (
                <div className="absolute top-3 left-3 flex items-center justify-center" title="Pendiente de sincronizar">
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-text-secondary bg-transparent"></span>
                </div>
            )}

            <div className="flex flex-col gap-1 pr-4 sm:pr-0 pl-4 sm:pl-0 min-w-0">
                <span className="text-base font-semibold text-text-primary flex flex-wrap items-center gap-2 min-w-0">
                    <span className="user-text-clamp" title={outcome.concept}>{outcome.concept || 'Sin concepto'}</span>
                    {outcome.desglose && outcome.desglose.length > 0 && (
                        <span className="text-xs bg-accent-app/20 text-accent-app px-2 py-0.5 rounded-full font-bold shrink-0">Dividido</span>
                    )}
                </span>
                <span className="text-xs text-text-secondary">{formatDate(outcome.date)}</span>
            </div>
            <div className="mt-3 sm:mt-0 flex items-center gap-4 sm:gap-6 justify-between sm:justify-end border-t sm:border-t-0 border-border-app/30 pt-3 sm:pt-0 shrink-0">
                <div className="flex flex-col items-start sm:items-end text-left sm:text-right min-w-0">
                    <span className="num text-lg font-mono text-negative font-bold tracking-tight max-w-full overflow-x-auto">
                        −{formatMoney(outcome.amount, baseCurrency, { absolute: true })}
                    </span>
                    {outcome.category && (
                        <span className="user-text text-xs text-text-secondary bg-bg-app px-2 py-0.5 rounded-full mt-1 max-w-[14rem]">{outcome.category}</span>
                    )}
                    {outcome.divisa_original && outcome.divisa_original !== baseCurrency && (
                        <p className="num text-xs text-text-secondary font-mono mt-1">
                            Original: {formatMoney(outcome.monto_original ?? outcome.amount, outcome.divisa_original)}
                            {!outcome.tasa_cambio && <span className="text-warning ml-1">(tasa pendiente)</span>}
                        </p>
                    )}
                </div>

                <button
                    onClick={() => handleEdit(outcome)}
                    className="btn-icon"
                    title="Editar Gasto"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                </button>
            </div>
        </div>
    )

    return (
        <div className="w-full flex-1 flex flex-col gap-8">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <h2 className="heading">Gastos</h2>
                        {isSyncing && (
                            <span className="tag-warning animate-pulse">
                                <span className="w-2 h-2 bg-warning rounded-full"></span>
                                Sincronizando
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-text-secondary">
                        Historial de salidas de dinero.
                    </p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="btn-primary"
                >
                    <span>+</span> Nuevo Gasto
                </button>
            </div>

            {syncError && (
                <p className="notice-warning" role="status">{syncError}</p>
            )}

            {outcomes.length === 0 ? (
                <div className="card w-full py-16 flex flex-col items-center gap-4 text-center">
                    <p className="text-sm text-text-secondary max-w-[45ch]">
                        Aún no hay gastos registrados. Anotá el primero para ver a dónde se va la plata.
                    </p>
                    <button onClick={handleAddNew} className="btn-primary">
                        <span>+</span> Nuevo Gasto
                    </button>
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
                                    {availableMonths.map(m => (
                                        <option key={m} value={m}>{formatMonth(m)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* RESUMEN DEL MES */}
                        <div className="flex flex-col items-end border-t md:border-t-0 md:border-l border-border-app/30 pt-4 md:pt-0 pl-0 md:pl-6 w-full md:w-auto">
                            <span className="text-xs text-text-secondary font-semibold">
                                {usingLocalTotal ? 'Total de lo cargado' : 'Total del mes'}
                            </span>
                            <span className="num text-xl font-mono font-bold text-negative max-w-full overflow-x-auto">
                                −{formatMoney(totalAmount, baseCurrency, { absolute: true })}
                            </span>
                        </div>
                    </div>

                    {futureOutcomes.length === 0 && pastOutcomes.length === 0 && (
                        <div className="card w-full py-16 text-center text-text-secondary text-sm">
                            No hay gastos que coincidan con estos filtros.
                        </div>
                    )}

                    {futureOutcomes.length > 0 && (
                        <div className="flex flex-col gap-4">
                            <h3 className="text-lg font-bold text-text-primary ml-1">Proyecciones</h3>
                            {futureOutcomes.map(renderOutcomeItem)}
                        </div>
                    )}

                    {pastOutcomes.length > 0 && (
                        <div className="flex flex-col gap-4">
                            <h3 className="text-lg font-bold text-text-primary ml-1">Historial</h3>
                            {pastOutcomes.map(renderOutcomeItem)}
                        </div>
                    )}

                    {filters.month === 'all' && hasMore && (
                        <button
                            onClick={loadMore}
                            disabled={loadingMore}
                            className="btn-secondary self-center mt-2"
                        >
                            {loadingMore ? 'Cargando…' : 'Cargar meses anteriores'}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
