import { AlertTriangle, AlertOctagon } from 'lucide-react'
import { formatMoney } from '../../lib/format'
import BaldeBar from './BaldeBar'

const LABELS = { necesidad: 'Necesidad', gusto: 'Gusto', ahorro: 'Ahorro' }

// A partir de acá avisamos que se está por comer el techo, antes de que se lo coma.
const UMBRAL_CERCA = 0.8

export default function BudgetSplitCard({ baldes, loading, hasIngreso, currency = 'CRC' }) {
    if (loading) {
        return (
            <div className="card h-full flex flex-col gap-4" aria-busy="true">
                <div className="skeleton h-5 w-40" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-1.5 w-full" />
            </div>
        )
    }

    return (
        <div className="card h-full flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">Cómo se te va la plata</h3>

            {!hasIngreso && (
                <p className="notice-warning" role="status">Registrá un ingreso este mes pa' ver el reparto.</p>
            )}

            <BaldeBar baldes={baldes} />

            <div className="flex flex-col gap-3">
                {['necesidad', 'gusto', 'ahorro'].map(balde => {
                    const { gastado, techo } = baldes[balde]
                    const ratio = techo > 0 ? gastado / techo : 0
                    const pasado = gastado > techo
                    const cerca = !pasado && ratio >= UMBRAL_CERCA

                    return (
                        <div key={balde} className="flex items-baseline justify-between gap-3">
                            <span className="text-sm text-text-secondary">{LABELS[balde]}</span>
                            <span className="flex items-baseline gap-1.5">
                                {pasado && <AlertOctagon className="size-4 self-center text-negative shrink-0" aria-label="Se pasó del límite" />}
                                {cerca && <AlertTriangle className="size-4 self-center text-warning shrink-0" aria-label="Cerca del límite" />}
                                <span className={`num font-mono text-base font-bold ${pasado ? 'text-negative' : cerca ? 'text-warning' : 'text-text-primary'}`}>
                                    {formatMoney(gastado, currency, { absolute: true })}
                                </span>
                                <span className="num font-mono text-xs font-normal text-text-secondary">
                                    / {formatMoney(techo, currency, { absolute: true })}
                                </span>
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
