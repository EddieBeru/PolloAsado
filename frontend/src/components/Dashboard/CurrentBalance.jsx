import { useSettings } from '../../hooks/useSettings'
import { formatMoney } from '../../lib/format'

export default function CurrentBalance({ balance = 0, stale = false, error = null, loading, onRetry }) {
    const { settings } = useSettings()
    const baseCurrency = settings?.divisa_principal || 'CRC'

    if (loading) {
        return (
            <div className="card flex flex-col gap-5" aria-busy="true">
                <div className="pb-2 border-b border-border-app/30">
                    <div className="skeleton h-5 w-24" />
                </div>
                <div className="skeleton h-8 w-2/3" />
                <span className="sr-only">Calculando tu balance…</span>
            </div>
        )
    }

    // Sin balance que mostrar: no inventamos un 0 que parezca un saldo real.
    if (error) {
        return (
            <div className="card flex flex-col gap-4">
                <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">
                    Cuenta
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

    return (
        <div className="card flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30 flex flex-wrap items-center gap-2">
                Cuenta
                {stale && (
                    <span className="tag-warning">Sin conexión · dato guardado</span>
                )}
            </h3>
            <div className="flex flex-col gap-1">
                <span
                    className={`num text-2xl font-mono font-bold tracking-tight overflow-x-auto ${balance >= 0 ? 'text-positive' : 'text-negative'}`}
                    aria-live="polite"
                >
                    {formatMoney(balance, baseCurrency)}
                </span>
                {stale && (
                    <span className="text-xs text-text-secondary">
                        Calculado con la última copia sincronizada más lo que registraste aquí.
                    </span>
                )}
            </div>
        </div>
    )
}
