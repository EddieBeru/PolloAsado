import { formatMoney } from '../../lib/format'
import BaldeBar from './BaldeBar'

const LABELS = { necesidad: 'Necesidad', gusto: 'Gusto', ahorro: 'Ahorro' }

export default function BudgetSplitCard({ baldes, loading, hasIngreso, currency = 'CRC' }) {
    if (loading) {
        return (
            <div className="card flex flex-col gap-4" aria-busy="true">
                <div className="skeleton h-5 w-40" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-1.5 w-full" />
            </div>
        )
    }

    return (
        <div className="card flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">Reparto 50/30/20</h3>

            {!hasIngreso && (
                <p className="notice-warning" role="status">Registrá un ingreso este mes pa' ver el reparto.</p>
            )}

            <BaldeBar baldes={baldes} />

            <div className="flex flex-col gap-3">
                {['necesidad', 'gusto', 'ahorro'].map(balde => (
                    <div key={balde} className="flex items-baseline justify-between gap-3">
                        <span className="text-sm text-text-secondary">{LABELS[balde]}</span>
                        <span className={`num font-mono text-sm font-bold ${baldes[balde].gastado > baldes[balde].techo ? 'text-negative' : 'text-text-primary'}`}>
                            {formatMoney(baldes[balde].gastado, currency, { absolute: true })} / {formatMoney(baldes[balde].techo, currency, { absolute: true })}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
