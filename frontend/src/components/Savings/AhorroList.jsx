import { useState } from 'react'
import { formatMoney } from '../../lib/format'

function ProgressBar({ actual, meta }) {
    const pct = meta > 0 ? Math.min(100, (actual / meta) * 100) : 0
    return (
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-bg-app" aria-hidden="true">
            <div className="bg-positive transition-[width] duration-200 ease-out" style={{ width: `${pct}%` }} />
        </div>
    )
}

export default function AhorroList({ savings = [], loading, onEdit, onAbonar, currency = 'CRC' }) {
    const [abonoInputs, setAbonoInputs] = useState({})

    if (loading) {
        return (
            <div className="flex flex-col gap-4">
                <div className="card skeleton h-24 w-full" aria-busy="true" />
                <div className="card skeleton h-24 w-full" aria-busy="true" />
            </div>
        )
    }

    if (savings.length === 0) {
        return (
            <div className="card flex flex-col items-center justify-center gap-2 min-h-[200px] text-center border-dashed">
                <p className="text-text-secondary">Todavía no tenés metas de ahorro. Creá la primera arriba.</p>
            </div>
        )
    }

    const handleAbonar = (id) => {
        const monto = parseFloat(abonoInputs[id])
        if (!Number.isFinite(monto) || monto <= 0) return
        onAbonar(id, monto)
        setAbonoInputs(prev => ({ ...prev, [id]: '' }))
    }

    return (
        <div className="flex flex-col gap-4">
            {savings.map(s => (
                <div key={s.id} className="card flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <span className="user-text text-lg font-bold text-text-primary truncate" title={s.nombre}>{s.nombre}</span>
                        <button type="button" onClick={() => onEdit(s)} className="text-sm font-semibold text-accent-app hover:underline shrink-0">Editar</button>
                    </div>

                    <ProgressBar actual={s.monto_actual} meta={s.monto_meta} />

                    <div className="flex items-baseline justify-between text-sm">
                        <span className="num font-mono font-bold text-text-primary">
                            {formatMoney(s.monto_actual, currency, { absolute: true })}
                        </span>
                        <span className="text-text-secondary">
                            de {formatMoney(s.monto_meta, currency, { absolute: true })}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={abonoInputs[s.id] || ''}
                            onChange={(e) => setAbonoInputs(prev => ({ ...prev, [s.id]: e.target.value }))}
                            placeholder="Abonar monto"
                            step="0.01"
                            min="0"
                            className="input flex-1 font-mono"
                        />
                        <button type="button" onClick={() => handleAbonar(s.id)} className="btn-secondary">Abonar</button>
                    </div>
                </div>
            ))}
        </div>
    )
}
