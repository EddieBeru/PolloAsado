import { useEffect, useRef } from "react"
import CurrentBalance from "./Dashboard/CurrentBalance"
import { useIncomes } from '../hooks/useIncomes'
import { useOutcomes } from '../hooks/useOutcomes'
import { useBalance } from '../hooks/useBalance'

export default function Dashboard({ user }) {

    const { incomes, loading: loadingIn, isSyncing: isSyncingIn, syncError: syncErrorIn } = useIncomes(user)
    const { outcomes, loading: loadingOut, isSyncing: isSyncingOut, syncError: syncErrorOut } = useOutcomes(user)

    const { balance, stale, error: balanceError, refresh } = useBalance(user, incomes, outcomes)

    // Re-correr el RPC del baseline cuando termina una sincronización (true -> false),
    // para que los items recién sincronizados pasen al baseline sin doble conteo.
    const wasSyncing = useRef(false)
    const syncing = isSyncingIn || isSyncingOut
    useEffect(() => {
        if (wasSyncing.current && !syncing) refresh()
        wasSyncing.current = syncing
    }, [syncing, refresh])

    const loading = loadingIn || loadingOut

    // Un mismo corte de red produce el mismo mensaje en ambos hooks; mostramos uno.
    const syncError = syncErrorIn && syncErrorOut && syncErrorIn === syncErrorOut
        ? syncErrorIn
        : [syncErrorIn, syncErrorOut].filter(Boolean).join(' ')

    const displayName = user?.user_metadata?.nombre || user?.email || 'por acá'

    return (
        <div className="w-full flex-1 flex flex-col gap-8">
            <div className="flex flex-col gap-2">
                <h2 className="heading user-text">
                    ¡Hola, {displayName}!
                </h2>
                <p className="text-sm text-text-secondary max-w-[65ch]">
                    Mira como se mueve tu plata acá. Vigila ingresos y gastos, deudas y ahorros; todo en un solo lugar.
                </p>
            </div>

            {syncError && (
                <p className="notice-warning" role="status">{syncError}</p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex flex-col gap-8">
                    <CurrentBalance
                        user={user}
                        balance={balance}
                        stale={stale}
                        error={balanceError}
                        loading={loading}
                        onRetry={refresh}
                    />
                </div>
            </div>
        </div>
    )
}
