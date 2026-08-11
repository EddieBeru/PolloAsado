import { CheckCircle2, Circle } from 'lucide-react'
import { formatMoney } from '../../lib/format'

export default function FixedExpensesChecklist({ fijos = [], hayAtrasados = false, loading, currency = 'CRC' }) {
    if (loading) {
        return (
            <div className="card h-full flex flex-col gap-4" aria-busy="true">
                <div className="skeleton h-5 w-32" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-full" />
            </div>
        )
    }

    return (
        <div className="card h-full flex flex-col gap-4">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">Gastos fijos este mes</h3>

            {hayAtrasados && (
                <p className="notice-warning" role="alert">Se pasó la fecha esperada de algún fijo pendiente.</p>
            )}

            {fijos.length === 0 ? (
                <p className="text-sm text-text-secondary">Todavía no tenés gastos fijos marcados.</p>
            ) : (
                <ul className="flex flex-col gap-2">
                    {fijos.map(f => (
                        <li key={f.grupo_recurrencia} className="flex items-center justify-between gap-3 bg-bg-app rounded-xl px-4 py-3 border border-border-app/30">
                            <div className="flex items-center gap-3 min-w-0">
                                {f.pagado ? (
                                    <CheckCircle2 className="size-5 shrink-0 text-positive" aria-hidden="true" />
                                ) : (
                                    <Circle className={`size-5 shrink-0 ${f.atrasado ? 'text-negative' : 'text-text-secondary'}`} aria-hidden="true" />
                                )}
                                <span className="user-text text-sm text-text-primary truncate" title={f.concept}>{f.concept}</span>
                            </div>
                            <span className="num font-mono text-sm font-bold text-text-secondary shrink-0">
                                {formatMoney(f.amount, currency, { absolute: true })}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
