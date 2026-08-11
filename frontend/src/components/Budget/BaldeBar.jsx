const COLORS = {
    necesidad: 'bg-accent-app',
    gusto: 'bg-positive',
    ahorro: 'bg-warning'
}

/** Barra de 3 segmentos, proporcional al gasto de cada balde. Decorativa. */
export default function BaldeBar({ baldes }) {
    const total = baldes.necesidad.gastado + baldes.gusto.gastado + baldes.ahorro.gastado
    if (!total) return null

    return (
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-bg-app" aria-hidden="true">
            {['necesidad', 'gusto', 'ahorro'].map(balde => {
                const share = (baldes[balde].gastado / total) * 100
                if (share <= 0) return null
                return (
                    <div
                        key={balde}
                        className={`${COLORS[balde]} transition-[width] duration-200 ease-out`}
                        style={{ width: `${share}%` }}
                    />
                )
            })}
        </div>
    )
}
