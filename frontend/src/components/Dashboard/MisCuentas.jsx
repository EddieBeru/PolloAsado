import { useSettings } from '../../hooks/useSettings'
import { formatMoney } from '../../lib/format'

export default function MisCuentas({ cuentas }) {
    const { settings } = useSettings()
    const baseCurrency = settings?.divisa_principal || 'CRC'

    return (
        <div className="card flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">Mis cuentas</h3>
            <div className="flex flex-col gap-3">
                {cuentas.map(c => (
                    <div key={c.id} className="flex items-center justify-between gap-3">
                        <span className="user-text text-sm text-text-primary">{c.nombre}</span>
                        <span className="num font-mono text-sm font-bold text-text-primary">{formatMoney(c.saldo, baseCurrency)}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
