export default function DebtAnalysis({ amount, due_date, ingresoMensual }) {

  if (!amount || !due_date || !ingresoMensual) return null;

  const calcularMeses = () => {
    const today = new Date();
    const limit = new Date(due_date);
    const months =
      (limit.getFullYear() - today.getFullYear()) * 12 +
      (limit.getMonth() - today.getMonth());
    return months > 0 ? months : 1;  // ← era "meses" pero debía ser "months"
  };

  const meses = calcularMeses();
  const monto = parseFloat(amount);
  const ingreso = parseFloat(ingresoMensual);

  const costoPorCuota = (monto / meses).toFixed(2);
  const porcentajeDelIngreso = ((costoPorCuota / ingreso) * 100).toFixed(1); // ← faltaba "Del"
  const ingresoRestante = (ingreso - costoPorCuota).toFixed(2); // ← era "costoPorCutoa"

  return (
    <div className="w-full card p-6 animate-in fade-in duration-300 flex flex-col gap-4">

      <div className="flex flex-col gap-1">
        <h3 className="heading">Análisis de tu Deuda</h3>
        <p className="text-xs text-text-secondary">
          Basado en tu ingreso mensual registrado de{" "}
          <strong>${ingreso.toLocaleString()}</strong>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">

        <div className="card p-4 flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Número de cuotas</span>
          <span className="text-2xl font-bold text-primary">{meses}</span>
          <span className="text-xs text-text-secondary">meses hasta la fecha límite</span>
        </div>

        <div className="card p-4 flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Cuota mensual</span>
          <span className="text-2xl font-bold text-primary">${costoPorCuota}</span>
          <span className="text-xs text-text-secondary">por mes</span>
        </div>

        <div className="card p-4 flex flex-col gap-1">
          <span className="text-xs text-text-secondary">% de tu ingreso</span>
          <span className="text-2xl font-bold text-primary">{porcentajeDelIngreso}%</span>
          <span className="text-xs text-text-secondary">destinado a esta deuda</span>
        </div>

        <div className="card p-4 flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Te queda libre</span>
          <span className="text-2xl font-bold text-primary">${ingresoRestante}</span>
          <span className="text-xs text-text-secondary">después de la cuota</span>
        </div>

      </div>
    </div>
  );
}