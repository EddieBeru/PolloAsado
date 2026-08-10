import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useSettings } from '../../hooks/useSettings'
import { formatMoney } from '../../lib/format'
import SplitBar from './SplitBar'

/** Una línea del desglose: etiqueta a la izquierda, monto a la derecha. */
function BreakdownRow({ label, amount, currency, tone }) {
    const positive = tone === 'positive'
    const Icon = positive ? ArrowUpRight : ArrowDownLeft
    const color = positive ? 'text-positive' : 'text-negative'
    const body = formatMoney(amount, currency, { absolute: true })

    return (
        <div className="flex items-baseline justify-between gap-3">
            <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                <Icon className={`size-4 shrink-0 ${color}`} aria-hidden="true" />
                {label}
            </span>
            <span className={`num font-mono text-sm font-bold ${color}`}>
                {positive ? '+' : '−'}{body}
            </span>
        </div>
    )
}

export default function CurrentBalance({
    balance = 0,
    totalIngresos = 0,
    totalGastos = 0,
    month = null,
    stale = false,
    error = null,
    loading,
    onRetry,
}) {
    const { settings } = useSettings()
    const baseCurrency = settings?.divisa_principal || 'CRC'

    if (loading) {
        return (
            <div className="card flex flex-col gap-5" aria-busy="true">
                <div className="border-b border-border-app/30 pb-2">
                    <div className="skeleton h-5 w-24" />
                </div>
                <div className="skeleton h-9 w-2/3" />
                <div className="well flex flex-col gap-4">
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-1.5 w-full" />
                    <div className="skeleton h-4 w-full" />
                </div>
                <span className="sr-only">Calculando tu saldo…</span>
            </div>
        )
    }

    // Sin balance que mostrar: no inventamos un 0 que parezca un saldo real.
    if (error) {
        return (
            <div className="card flex flex-col gap-4">
                <h3 className="border-b border-border-app/30 pb-2 text-lg font-semibold text-text-primary">
                    Saldo
                </h3>
                <p className="notice-negative" role="alert">{error}</p>
                {onRetry && (
                    <button type="button" onClick={onRetry} className="btn-secondary self-start">
                        Reintentar
                    </button>
                )}
            </div>
        )
    }

    const sinMovimientos = totalIngresos === 0 && totalGastos === 0
    // El desglose y el mes salen del mismo baseline cacheado; si cualquiera de
    // los dos quedó viejo, la tarjeta entera está mostrando datos guardados.
    const showStale = stale || Boolean(month?.stale)

    return (
        <div className="card flex flex-col gap-5">
            <h3 className="flex flex-wrap items-center gap-2 border-b border-border-app/30 pb-2 text-lg font-semibold text-text-primary">
                Saldo
                {showStale && (
                    <span className="tag-warning">Sin conexión · dato guardado</span>
                )}
            </h3>

            {/* El saldo neto no es dinero entrando ni saliendo: va en tinta normal.
                El verde y el rojo se quedan para ingresos y gastos, abajo. */}
            <div className="flex flex-col gap-1">
                <span
                    className="num overflow-x-auto font-mono text-3xl font-bold tracking-tight text-text-primary"
                    aria-live="polite"
                >
                    {formatMoney(balance, baseCurrency)}
                </span>
                {stale && (
                    <span className="text-xs text-text-secondary">
                        Suma la última copia sincronizada más lo que anotaste en este dispositivo.
                    </span>
                )}
            </div>

            <div className="well flex flex-col gap-3">
                {sinMovimientos ? (
                    <p className="text-sm text-text-secondary">
                        Sin movimientos todavía. Anotá un ingreso o un gasto y acá aparece el desglose.
                    </p>
                ) : (
                    <>
                        <BreakdownRow
                            label="Ingresos"
                            amount={totalIngresos}
                            currency={baseCurrency}
                            tone="positive"
                        />
                        <SplitBar positive={totalIngresos} negative={totalGastos} />
                        <BreakdownRow
                            label="Gastos"
                            amount={totalGastos}
                            currency={baseCurrency}
                            tone="negative"
                        />
                    </>
                )}
            </div>

            {/* Un mes en ceros no aporta nada sobre el desglose vacío de arriba. */}
            {month && !(sinMovimientos && month.ingresos === 0 && month.gastos === 0) && (
                <MonthToDate month={month} currency={baseCurrency} />
            )}
        </div>
    )
}

/** Contexto reciente: el acumulado explica el saldo, el mes explica el ritmo. */
function MonthToDate({ month, currency }) {
    if (month.loading) {
        return <div className="skeleton h-4 w-2/3" />
    }

    if (!month.hasData) {
        return (
            <p className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                No se pudo cargar lo que va del mes.
                <button
                    type="button"
                    onClick={month.refresh}
                    className="rounded-sm text-accent-app underline underline-offset-2 hover:opacity-90"
                >
                    Reintentar
                </button>
            </p>
        )
    }

    return (
        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
            <span className="text-text-secondary">Lo que va del mes</span>
            <span className="num font-mono font-bold text-positive">
                <span className="sr-only">Ingresos: </span>
                +{formatMoney(month.ingresos, currency, { absolute: true })}
            </span>
            <span className="num font-mono font-bold text-negative">
                <span className="sr-only">Gastos: </span>
                −{formatMoney(month.gastos, currency, { absolute: true })}
            </span>
        </p>
    )
}
