import { useSettings } from '../../hooks/useSettings'
import { formatMoney, formatNumber, toNumber } from '../../lib/format'

export default function DebtAnalysis({ amount, due_date, ingresoMensual }) {
  const { settings } = useSettings()
  const baseCurrency = settings?.divisa_principal || 'CRC'

  const monto = toNumber(amount, NaN)
  const ingreso = toNumber(ingresoMensual, NaN)
  const fechaValida = typeof due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(due_date)

  // Sin datos completos no hay nada que analizar todavía.
  if (!Number.isFinite(monto) || monto <= 0 || !fechaValida) return null

  const calcularMeses = () => {
    const today = new Date()
    const [y, m] = due_date.split('-').map(Number)
    const months = (y - today.getFullYear()) * 12 + ((m - 1) - today.getMonth())
    return months > 0 ? months : 1 // fecha pasada o este mismo mes: una sola cuota
  }

  const meses = calcularMeses()
  const costoPorCuota = monto / meses

  // Un ingreso de 0 (o ausente) haría Infinity/NaN: mejor decir que falta el dato.
  const tieneIngreso = Number.isFinite(ingreso) && ingreso > 0
  const porcentajeDelIngreso = tieneIngreso ? (costoPorCuota / ingreso) * 100 : null
  const ingresoRestante = tieneIngreso ? ingreso - costoPorCuota : null

  return (
    <div className="w-full card flex flex-col gap-4">

      <div className="flex flex-col gap-1">
        <h3 className="heading">Tu cuota</h3>
        <p className="text-xs text-text-secondary">
          {tieneIngreso
            ? <>Calculado sobre un ingreso mensual de ejemplo de <strong className="num">{formatMoney(ingreso, baseCurrency)}</strong>.</>
            : 'Falta el ingreso mensual con el que comparar la cuota.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        <div className="well flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Cuotas</span>
          <span className="num text-2xl font-bold text-text-primary">{meses}</span>
          <span className="text-xs text-text-secondary">meses hasta la fecha límite</span>
        </div>

        <div className="well flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Cuota mensual</span>
          <span className="num text-2xl font-bold text-text-primary">{formatMoney(costoPorCuota, baseCurrency)}</span>
          <span className="text-xs text-text-secondary">por mes</span>
        </div>

        <div className="well flex flex-col gap-1">
          <span className="text-xs text-text-secondary">% de tu ingreso</span>
          <span className={`num text-2xl font-bold ${porcentajeDelIngreso !== null && porcentajeDelIngreso > 100 ? 'text-negative' : 'text-text-primary'}`}>
            {porcentajeDelIngreso === null ? '—' : `${formatNumber(porcentajeDelIngreso, { decimals: 1 })}%`}
          </span>
          <span className="text-xs text-text-secondary">
            {porcentajeDelIngreso === null ? 'falta el ingreso mensual' : 'destinado a esta deuda'}
          </span>
        </div>

        <div className="well flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Te queda libre</span>
          <span className={`num text-2xl font-bold ${ingresoRestante !== null && ingresoRestante < 0 ? 'text-negative' : 'text-text-primary'}`}>
            {ingresoRestante === null ? '—' : formatMoney(ingresoRestante, baseCurrency)}
          </span>
          <span className="text-xs text-text-secondary">
            {ingresoRestante === null ? 'falta el ingreso mensual' : 'después de la cuota'}
          </span>
        </div>

      </div>
    </div>
  )
}
