import { useSettings } from '../../hooks/useSettings'
import { formatMoney, formatPercent } from '../../lib/format'

const TOP_N = 5

/**
 * En qué se fue el gasto del mes, mayor primero.
 *
 * Las barras se miden contra la categoría más grande, no contra el total: lo que
 * se compara acá es el tamaño relativo entre categorías. El porcentaje del total
 * va escrito al lado, que es donde esa lectura sí es exacta.
 *
 * Los datos llegan desde Dashboard (no del hook aquí adentro) para que una
 * sincronización pueda revalidar el desglose junto con el balance: si no, al
 * terminar el PUSH los pendientes salen de la lista local y el gasto del mes se
 * queda corto hasta la siguiente carga.
 */
export default function TopCategories({ spending, monthGastos = 0 }) {
    const { settings } = useSettings()
    const currency = settings?.divisa_principal || 'CRC'
    const { categories = [], hasData, loading, stale, error, refresh } = spending ?? {}

    if (loading) {
        return (
            <div className="card flex flex-col gap-5" aria-busy="true">
                <div className="border-b border-border-app/30 pb-2">
                    <div className="skeleton h-5 w-40" />
                </div>
                <div className="flex flex-col gap-4">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="flex flex-col gap-2">
                            <div className="skeleton h-4 w-full" />
                            <div className="skeleton h-1.5 w-full" />
                        </div>
                    ))}
                </div>
                <span className="sr-only">Cargando el gasto por categoría…</span>
            </div>
        )
    }

    if (!hasData && error) {
        return (
            <div className="card flex flex-col gap-4">
                <Title />
                <p className="notice-negative" role="alert">
                    No se pudo cargar el gasto por categoría.
                </p>
                <button type="button" onClick={refresh} className="btn-secondary self-start">
                    Reintentar
                </button>
            </div>
        )
    }

    if (categories.length === 0) {
        return (
            <div className="card flex flex-col gap-4">
                <Title stale={stale} />
                <p className="text-sm text-text-secondary">
                    Sin gastos este mes. Cuando registrés el primero, acá se ordenan por categoría.
                </p>
            </div>
        )
    }

    const top = categories.slice(0, TOP_N)
    const max = top[0].total
    const shown = top.reduce((acc, c) => acc + c.total, 0)
    // El total del mes es la referencia; si el desglose no lo cubre, el resto se
    // dice en voz alta en vez de desaparecer.
    const rest = Math.max(monthGastos - shown, 0)
    const restCount = categories.length - top.length

    return (
        <div className="card flex flex-col gap-5">
            <Title stale={stale} />

            <ul className="flex flex-col gap-4">
                {top.map((c) => (
                    <li key={c.categoria} className="flex flex-col gap-2">
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="user-text-clamp text-sm text-text-primary">
                                {c.categoria}
                            </span>
                            <span className="num font-mono text-sm font-bold text-negative">
                                −{formatMoney(c.total, currency, { absolute: true })}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-app" aria-hidden="true">
                                <div
                                    className="h-full rounded-full bg-negative/60 transition-[width] duration-200 ease-out"
                                    style={{ width: `${max > 0 ? (c.total / max) * 100 : 0}%` }}
                                />
                            </div>
                            <span className="num w-12 shrink-0 text-right text-xs text-text-secondary">
                                {formatPercent(c.total, monthGastos) ?? '—'}
                            </span>
                        </div>
                    </li>
                ))}
            </ul>

            {rest > 0.005 && (
                <p className="num text-xs text-text-secondary">
                    {restLabel(restCount)}: −{formatMoney(rest, currency, { absolute: true })}
                </p>
            )}
        </div>
    )
}

/**
 * El resto no siempre son categorías: puede ser gasto del mes que el desglose
 * del servidor todavía no refleja. Se nombra según lo que realmente se sabe.
 */
function restLabel(count) {
    if (count <= 0) return 'Otros gastos del mes'
    return count === 1 ? 'Otra categoría' : `Otras ${count} categorías`
}

function Title({ stale = false }) {
    return (
        <h3 className="flex flex-wrap items-center gap-2 border-b border-border-app/30 pb-2 text-lg font-semibold text-text-primary">
            En qué se fue este mes
            {stale && <span className="tag-warning">Sin conexión · dato guardado</span>}
        </h3>
    )
}
