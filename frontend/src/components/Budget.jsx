import { useMemo } from 'react'
import FixedExpensesChecklist from './Budget/FixedExpensesChecklist'
import BudgetSplitCard from './Budget/BudgetSplitCard'
import ConsejosCard from './Budget/ConsejosCard'
import { useOutcomes } from '../hooks/useOutcomes'
import { useIncomes } from '../hooks/useIncomes'
import { useProfilePreferences } from '../hooks/useProfilePreferences'
import { useBudgetSplit } from '../hooks/useBudgetSplit'
import { useSavings } from '../hooks/useSavings'
import { useSettings } from '../hooks/useSettings'
import { computeFixedExpensesStatus } from '../lib/fixedExpenses'
import { today } from '../lib/period'

export default function Budget({ user }) {
    const { outcomes, loading: loadingOut } = useOutcomes(user)
    const { incomes } = useIncomes(user)
    const { preferencias, loading: loadingPrefs } = useProfilePreferences(user)
    const { savings, loading: loadingSavings } = useSavings(user)
    const { settings } = useSettings()
    const baseCurrency = settings?.divisa_principal || 'CRC'

    const now = new Date()
    const { fijos, hayAtrasados } = useMemo(
        () => computeFixedExpensesStatus(outcomes, { anio: now.getFullYear(), mes: now.getMonth() + 1, hoy: today() }),
        [outcomes]
    )

    const { baldes, loading: loadingSplit, hasIngreso } = useBudgetSplit(preferencias, incomes, outcomes)

    return (
        <div className="w-full flex-1 flex flex-col gap-8">
            <h2 className="heading">Presupuestos</h2>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-8">
                <FixedExpensesChecklist fijos={fijos} hayAtrasados={hayAtrasados} loading={loadingOut} currency={baseCurrency} />
                <BudgetSplitCard baldes={baldes} loading={loadingSplit || loadingPrefs} hasIngreso={hasIngreso} currency={baseCurrency} />
            </div>

            <ConsejosCard baldes={baldes} metasAhorro={savings} loading={loadingSplit || loadingSavings} />
        </div>
    )
}
