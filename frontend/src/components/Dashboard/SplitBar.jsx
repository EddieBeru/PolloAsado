/**
 * Los mismos dos montos del desglose, dibujados como longitud.
 *
 * Decorativo por definición: las cifras exactas ya están escritas al lado, así
 * que la barra queda fuera del árbol de accesibilidad en vez de repetirlas.
 */
export default function SplitBar({ positive = 0, negative = 0 }) {
    const inflow = Math.abs(positive)
    const outflow = Math.abs(negative)
    const total = inflow + outflow

    // Sin movimientos no hay proporción que mostrar; una barra vacía sería ruido.
    if (!total) return null

    const share = (inflow / total) * 100

    return (
        <div
            className="flex h-1.5 w-full overflow-hidden rounded-full bg-bg-app"
            aria-hidden="true"
        >
            <div
                className="bg-positive transition-[width] duration-200 ease-out"
                style={{ width: `${share}%` }}
            />
            <div className="flex-1 bg-negative" />
        </div>
    )
}
