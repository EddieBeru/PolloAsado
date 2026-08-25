import { summarizeRows } from '../../lib/bankImport/wizardSteps'

export default function ImportConfirmScreen({ rows, canConfirm, onConfirm }) {
    const { creados, vinculados, omitidos, yaImportados } = summarizeRows(rows)
    const total = creados + vinculados
    const nadaQueHacer = total === 0

    return (
        <div className="card flex-1 flex flex-col items-center justify-center gap-8 min-h-[70vh] text-center">
            <div className="flex flex-col items-center gap-2">
                <h3 className="heading text-3xl">{nadaQueHacer ? 'Nada por importar' : '¿Todo listo?'}</h3>
                <p className="text-text-secondary max-w-sm">
                    {nadaQueHacer
                        ? `Los ${rows.length} movimientos del archivo ya estaban en tu cuenta. No hay nada nuevo que importar.`
                        : `Revisamos ${rows.length} movimientos del archivo. Esto es lo que va a pasar al confirmar.`}
                </p>
            </div>

            <div className="well flex flex-col gap-3 w-full max-w-sm text-left">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Se crean</span>
                    <span className="num font-mono font-bold text-text-primary">{creados}</span>
                </div>
                {vinculados > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-text-secondary">Se vinculan a existentes</span>
                        <span className="num font-mono font-bold text-text-primary">{vinculados}</span>
                    </div>
                )}
                {omitidos > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-text-secondary">Se omiten</span>
                        <span className="num font-mono font-bold text-text-primary">{omitidos}</span>
                    </div>
                )}
                {yaImportados > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-text-secondary">Ya importados antes</span>
                        <span className="num font-mono font-bold text-text-primary">{yaImportados}</span>
                    </div>
                )}
            </div>

            {!nadaQueHacer && (
                <div className="flex flex-col items-center gap-2">
                    <button type="button" className="btn-primary" disabled={!canConfirm} onClick={onConfirm}>
                        Confirmar importación ({total})
                    </button>
                    {!canConfirm && (
                        <p className="text-xs text-text-secondary">Resolvé las filas marcadas y asigná categoría a los gastos antes de confirmar.</p>
                    )}
                </div>
            )}
        </div>
    )
}
