import { useEffect, useRef } from "react"
import CurrentBalance from "./Dashboard/CurrentBalance"
import { useIncomes } from '../hooks/useIncomes'
import { useOutcomes } from '../hooks/useOutcomes'
import { useBalance } from '../hooks/useBalance'

export default function Dashboard({ user }) {

    const { incomes, loading: loadingIn, isSyncing: isSyncingIn } = useIncomes(user)
    const { outcomes, loading: loadingOut, isSyncing: isSyncingOut } = useOutcomes(user)

    const { balance, stale, refresh } = useBalance(user, incomes, outcomes)

    // Re-correr el RPC del baseline cuando termina una sincronización (true -> false),
    // para que los items recién sincronizados pasen al baseline sin doble conteo.
    const wasSyncing = useRef(false)
    const syncing = isSyncingIn || isSyncingOut
    useEffect(() => {
        if (wasSyncing.current && !syncing) refresh()
        wasSyncing.current = syncing
    }, [syncing, refresh])

    if (loadingIn || loadingOut) {
        return (
            <div className="w-full flex-1 flex items-center justify-center min-h-[50vh] text-text-secondary text-sm">
                Cargando tu resumen…
            </div>
        )
    }

    return (
        <div className="w-full flex-1 flex flex-col gap-8">
            <div className="flex flex-col gap-2">
                <h2 className="heading">
                    ¡Hola, {user.email}!
                </h2>
                <p className="text-sm text-text-secondary">
                    Mira como se mueve tu plata acá. Vigila ingresos y gastos, deudas y ahorros; todo en un solo lugar.
                </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex flex-col gap-8">
                    <CurrentBalance user={user} balance={balance} stale={stale} loading={loadingIn || loadingOut} />
                </div>
            </div>
        </div>
    )
}
