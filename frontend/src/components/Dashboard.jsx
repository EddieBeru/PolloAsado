import CurrentBalance from "./Dashboard/CurrentBalance"
import { useIncomes } from '../hooks/useIncomes'
import { useOutcomes } from '../hooks/useOutcomes'

export default function Dashboard({ user }) {

    const { incomes, loadingIn, isSyncingIn } = useIncomes(user)
    const { outcomes, loadingOut, isSyncingOut } = useOutcomes(user)

    if (loadingIn || loadingOut) {
        return (
            <div class="card flex flex-col gap-5">
                <h1>El contenido está cargando  :P</h1>
            </div>
        )
    }

    return (
        <div class="w-full flex-1 flex flex-col gap-8 animate-in fade-in duration-300">
            <div class="flex flex-col gap-2">
                <h2 class="heading">
                    ¡Hola, {user.email}!
                </h2>
                <p class="text-sm text-text-secondary">
                    Mira como se mueve tu plata acá. Vigila ingresos y gastos, deudas y ahorros; todo en un solo lugar.
                </p>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="flex flex-col gap-8">
                    <CurrentBalance user={user} incomes={incomes} outcomes={outcomes} loading={loadingIn || loadingOut} />
                </div>
            </div>
        </div>
    )
}