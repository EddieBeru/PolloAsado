export default function CurrentBalance({ user, incomes, outcomes, loading }) {
    if (loading) {
        return (
            <div className="card flex flex-col gap-5">
                <h1>El contenido está cargando  :P</h1>
            </div>
        )
    }

    const finalIncome = incomes.reduce((accum, current) => { return accum + current.amount }, 0);
    const finalOutcome = incomes.reduce((accum, current) => { return accum + current.amount }, 0);
    const finalBalance = finalIncome - finalOutcome;

    return (
        <div className="card flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">
                Cuenta
            </h3>
            <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-emerald-400">
                    {finalBalance}
                </span>
            </div>
        </div>
    )
}