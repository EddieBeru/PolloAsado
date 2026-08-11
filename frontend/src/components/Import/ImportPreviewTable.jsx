import { formatMoney, formatDate } from '../../lib/format'

const CATEGORIAS_GASTO = ['Alimentación', 'Vivienda', 'Transporte', 'Salud', 'Entretenimiento', 'Educación', 'Ropa', 'Servicios', 'Otros']
const CATEGORIAS_INGRESO = [
    { value: 'salary', label: 'Salario' },
    { value: 'business', label: 'Negocio' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'investments', label: 'Inversiones' },
    { value: 'gifts', label: 'Regalos' },
    { value: 'other', label: 'Otros' }
]

function CategorySelect({ row, onChange }) {
    if (row.tipo === 'ingreso') {
        return (
            <select className="input cursor-pointer" value={row.categoria} onChange={(e) => onChange({ categoria: e.target.value })}>
                <option value="">Sin categorizar</option>
                {CATEGORIAS_INGRESO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
        )
    }
    return (
        <select className="input cursor-pointer" value={row.categoria} onChange={(e) => onChange({ categoria: e.target.value })}>
            <option value="">Sin categorizar</option>
            {CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
    )
}

function FlagRow({ row, onChange }) {
    if (row.flagTipo === 'ya_existe') {
        return (
            <div className="notice-warning flex flex-col gap-2">
                <p>¿Ya capturaste este movimiento a mano? {formatMoney(row.monto)} el {formatDate(row.fecha)}.</p>
                <div className="flex gap-2 flex-wrap">
                    <button type="button" className="btn-secondary" onClick={() => onChange({ resolucion: 'vincular' })}>Vincular con el existente</button>
                    <button type="button" className="btn-secondary" onClick={() => onChange({ resolucion: 'importar_de_todas_formas' })}>Son movimientos distintos, importar</button>
                    <button type="button" className="btn-secondary" onClick={() => onChange({ resolucion: 'omitir', incluir: false })}>Omitir</button>
                </div>
                {row.resolucion && <p className="text-xs text-text-secondary">Elegiste: {row.resolucion.replace(/_/g, ' ')}</p>}
            </div>
        )
    }
    if (row.flagTipo === 'cargo_doble') {
        return (
            <div className="notice-warning flex flex-col gap-2">
                <p>Posible cargo doble por autorización: {formatMoney(row.monto)} el {formatDate(row.fecha)}, mismo comercio que otra fila de este archivo.</p>
                <div className="flex gap-2 flex-wrap">
                    <button type="button" className="btn-secondary" onClick={() => onChange({ resolucion: 'mismo_cargo', incluir: false })}>Es el mismo cargo, omitir esta fila</button>
                    <button type="button" className="btn-secondary" onClick={() => onChange({ resolucion: 'dos_cargos_reales' })}>Son 2 cargos reales, importar ambos</button>
                </div>
                {row.resolucion && <p className="text-xs text-text-secondary">Elegiste: {row.resolucion.replace(/_/g, ' ')}</p>}
            </div>
        )
    }
    return null
}

export default function ImportPreviewTable({ rows, onUpdateRow }) {
    const flagged = rows.filter(r => r.flagTipo)
    const rest = rows.filter(r => !r.flagTipo)

    return (
        <div className="flex flex-col gap-6">
            {flagged.length > 0 && (
                <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-text-primary">Revisar antes de confirmar ({flagged.length})</h3>
                    {flagged.map(row => (
                        <div key={row.id} className="card flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <span className="user-text text-sm">{row.descripcion}</span>
                                <span className="num font-mono text-sm font-bold">{formatMoney(row.monto)}</span>
                            </div>
                            <FlagRow row={row} onChange={(patch) => onUpdateRow(row.id, patch)} />
                            {row.resolucion && !['omitir', 'mismo_cargo'].includes(row.resolucion) && (
                                <CategorySelect row={row} onChange={(patch) => onUpdateRow(row.id, patch)} />
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold text-text-primary">Movimientos ({rest.length})</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-text-secondary border-b border-border-app/30">
                                <th className="py-2 pr-3">Incluir</th>
                                <th className="py-2 pr-3">Fecha</th>
                                <th className="py-2 pr-3">Descripción</th>
                                <th className="py-2 pr-3">Monto</th>
                                <th className="py-2 pr-3">Categoría</th>
                                <th className="py-2 pr-3">Recordar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rest.map(row => (
                                <tr key={row.id} className="border-b border-border-app/10">
                                    <td className="py-2 pr-3">
                                        <input
                                            type="checkbox"
                                            checked={row.incluir}
                                            disabled={row.invalid}
                                            onChange={(e) => onUpdateRow(row.id, { incluir: e.target.checked })}
                                        />
                                    </td>
                                    <td className="py-2 pr-3 num font-mono">{formatDate(row.fecha)}</td>
                                    <td className="py-2 pr-3 user-text max-w-xs truncate" title={row.descripcion}>
                                        {row.descripcion}
                                        {row.invalid && <span className="text-negative text-xs block">{row.invalidReason}</span>}
                                    </td>
                                    <td className="py-2 pr-3 num font-mono">{row.tipo ? formatMoney(row.monto) : '—'}</td>
                                    <td className="py-2 pr-3">
                                        {row.invalid ? '—' : <CategorySelect row={row} onChange={(patch) => onUpdateRow(row.id, patch)} />}
                                    </td>
                                    <td className="py-2 pr-3">
                                        {!row.invalid && (
                                            <input
                                                type="checkbox"
                                                checked={row.recordarRegla}
                                                onChange={(e) => onUpdateRow(row.id, { recordarRegla: e.target.checked })}
                                                title="Recordar esta categoría para este comercio"
                                            />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
