import { useEffect, useRef } from "react"
import CurrentBalance from "./Dashboard/CurrentBalance"
import TopCategories from "./Dashboard/TopCategories"
import MisCuentas from "./Dashboard/MisCuentas"
import { useIncomes } from '../hooks/useIncomes'
import { useOutcomes } from '../hooks/useOutcomes'
import { useBalance } from '../hooks/useBalance'
import { useMonthTotals } from '../hooks/useMonthTotals'
import { useSpendingByCategory } from '../hooks/useSpendingByCategory'
import { useCuentas } from '../hooks/useCuentas'

export default function Dashboard({ user }) {

    const { incomes, loading: loadingIn, isSyncing: isSyncingIn, syncError: syncErrorIn } = useIncomes(user)
    const { outcomes, loading: loadingOut, isSyncing: isSyncingOut, syncError: syncErrorOut } = useOutcomes(user)
    const { cuentas } = useCuentas(user)

    const {
        balance,
        totalIngresos,
        totalGastos,
        stale,
        error: balanceError,
        refresh,
    } = useBalance(user, incomes, outcomes)

    const month = useMonthTotals(incomes, outcomes)
    const spending = useSpendingByCategory(outcomes)

    // Re-correr el RPC del baseline cuando termina una sincronización (true -> false),
    // para que los items recién sincronizados pasen al baseline sin doble conteo.
    const wasSyncing = useRef(false)
    const syncing = isSyncingIn || isSyncingOut
    const refreshMonth = month.refresh
    const refreshSpending = spending.refresh
    useEffect(() => {
        if (wasSyncing.current && !syncing) {
            // Los tres leen el mismo hecho (baseline del servidor + pendientes
            // locales); si uno se queda viejo, el desglose deja de cuadrar.
            refresh()
            refreshMonth()
            refreshSpending()
        }
        wasSyncing.current = syncing
    }, [syncing, refresh, refreshMonth, refreshSpending])

    const loading = loadingIn || loadingOut

    // Un mismo corte de red produce el mismo mensaje en ambos hooks; mostramos uno.
    const syncError = syncErrorIn && syncErrorOut && syncErrorIn === syncErrorOut
        ? syncErrorIn
        : [syncErrorIn, syncErrorOut].filter(Boolean).join(' ')

    // Sin nombre no saludamos con el correo: "¡Hola, juan@correo.com!" no es
    // un saludo, es un dato de sesión.
    const nombre = user?.user_metadata?.nombre?.trim()

    return (
        <div className="w-full flex-1 flex flex-col gap-8">
            <h2 className="heading user-text">
                {nombre ? `Hola, ${nombre}` : 'Tu dinero hoy'}
            </h2>

            {syncError && (
                <p className="notice-warning" role="status">{syncError}</p>
            )}

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-8">
                <CurrentBalance
                    balance={balance}
                    totalIngresos={totalIngresos}
                    totalGastos={totalGastos}
                    month={month}
                    stale={stale}
                    error={balanceError}
                    loading={loading}
                    onRetry={refresh}
                />
                <TopCategories spending={spending} monthGastos={month.gastos} />
            </div>

            {cuentas.filter(c => c.activa).length > 1 && (
                <MisCuentas cuentas={cuentas.filter(c => c.activa)} />
            )}
        </div>
    )
}
