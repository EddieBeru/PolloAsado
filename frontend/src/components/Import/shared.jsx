import { formatMoney, formatDate } from '../../lib/format'

export const CATEGORIAS_GASTO = ['Alimentación', 'Vivienda', 'Transporte', 'Salud', 'Entretenimiento', 'Educación', 'Ropa', 'Servicios', 'Otros']
export const CATEGORIAS_INGRESO = [
    { value: 'salary', label: 'Salario' },
    { value: 'business', label: 'Negocio' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'investments', label: 'Inversiones' },
    { value: 'gifts', label: 'Regalos' },
    { value: 'other', label: 'Otros' }
]

export function CategorySelect({ row, onChange }) {
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

export function FlagRow({ row, onChange }) {
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
