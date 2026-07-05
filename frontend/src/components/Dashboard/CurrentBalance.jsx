import { useSettings } from '../../hooks/useSettings'

export default function CurrentBalance({ balance = 0, stale = false, loading }) {
    const { settings } = useSettings()
    const baseCurrency = settings?.divisa_principal || 'CRC'

    if (loading) {
        return (
            <div className="card flex flex-col gap-5">
                <h1>El contenido está cargando  :P</h1>
            </div>
        )
    }

    return (
        <div className="card flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30 flex items-center gap-2">
                Cuenta
                {stale && (
                    <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full font-mono">
                        sin conexión
                    </span>
                )}
            </h3>
            <div className="flex flex-col gap-1">
                <span className={`text-xl font-mono font-bold tracking-tight ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {balance.toFixed(2)} {baseCurrency}
                </span>
            </div>
        </div>
    )
}
