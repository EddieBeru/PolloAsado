import { useEffect, useMemo, useState } from 'react'
import { pendingWizardRows } from '../../lib/bankImport/wizardSteps'
import { rankCategories } from '../../lib/bankImport/categorize'
import { CategorySelect, FlagRow, CATEGORIAS_GASTO, CATEGORIAS_INGRESO } from './shared'
import { formatMoney, formatDate } from '../../lib/format'

function labelForCategoria(tipo, value) {
    if (tipo !== 'ingreso') return value
    return CATEGORIAS_INGRESO.find(c => c.value === value)?.label || value
}

function CategoryButtons({ row, categoryHints, onChange }) {
    const options = row.tipo === 'ingreso' ? CATEGORIAS_INGRESO.map(c => c.value) : CATEGORIAS_GASTO
    const merchantMap = categoryHints.merchantMap[row.tipo] || new Map()
    const frecuencias = (categoryHints.frecuencias[row.tipo] || []).filter(f => options.includes(f.categoria))
    const suggested = rankCategories(row.descripcionNormalizada, merchantMap, frecuencias, 5)
    const [showAll, setShowAll] = useState(suggested.length === 0)

    if (showAll) {
        return <CategorySelect row={row} onChange={onChange} />
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {suggested.map(value => (
                    <button
                        key={value}
                        type="button"
                        className="btn-secondary text-base py-3"
                        onClick={() => onChange({ categoria: value })}
                    >
                        {labelForCategoria(row.tipo, value)}
                    </button>
                ))}
            </div>
            <button type="button" className="text-xs text-text-secondary underline self-start" onClick={() => setShowAll(true)}>
                Ver todas las categorías
            </button>
        </div>
    )
}

export default function ImportWizard({ rows, onUpdateRow, categoryHints, onFinish, onSavePartial }) {
    const pending = useMemo(() => pendingWizardRows(rows), [rows])
    const [stepIds, setStepIds] = useState(() => (pending[0] ? [pending[0].id] : []))
    const [cursor, setCursor] = useState(0)
    const [totalSteps] = useState(() => pending.length)

    useEffect(() => {
        if (pending.length === 0) {
            onFinish()
            return
        }
        const frontId = stepIds[stepIds.length - 1]
        const frontStillPending = pending.some(r => r.id === frontId)
        if (!frontStillPending) {
            setStepIds(prev => [...prev, pending[0].id])
            setCursor(prev => prev + 1)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pending])

    const currentId = stepIds[cursor]
    const currentRow = rows.find(r => r.id === currentId)
    if (!currentRow) return null

    const handleChange = (patch) => onUpdateRow(currentRow.id, patch)
    const flagResolved = !currentRow.flagTipo || (currentRow.resolucion && !['omitir', 'mismo_cargo'].includes(currentRow.resolucion))
    const needsCategoryStep = flagResolved && currentRow.tipo === 'gasto' && !currentRow.categoria && currentRow.resolucion !== 'vincular'

    return (
        <div className="card flex-1 flex flex-col gap-6 min-h-[70vh]">
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-text-secondary">Fila {cursor + 1} de {totalSteps}</p>
                    <button type="button" className="btn-secondary text-xs px-3 py-1.5" onClick={onSavePartial}>Guardar hasta ahora</button>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface-raised overflow-hidden">
                    <div
                        className="h-full bg-accent-app transition-all"
                        style={{ width: `${((cursor + 1) / totalSteps) * 100}%` }}
                    />
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-8 py-6">
                <div className="flex flex-col items-center gap-2 text-center">
                    <span className="num font-mono text-5xl sm:text-6xl font-bold text-text-primary leading-tight">
                        {formatMoney(currentRow.monto)}
                    </span>
                    <span className="user-text text-xl sm:text-2xl font-semibold text-text-primary max-w-md">
                        {currentRow.descripcion}
                    </span>
                    <span className="text-sm text-text-secondary">{formatDate(currentRow.fecha)}</span>
                </div>

                <div className="flex flex-col items-center gap-4 w-full max-w-md">
                    {currentRow.flagTipo && <FlagRow row={currentRow} onChange={handleChange} />}
                    {needsCategoryStep && <CategoryButtons key={currentRow.id} row={currentRow} categoryHints={categoryHints} onChange={handleChange} />}
                </div>
            </div>

            <div className="flex justify-center gap-2">
                <button
                    type="button"
                    className="btn-secondary"
                    disabled={cursor === 0}
                    onClick={() => setCursor(c => Math.max(0, c - 1))}
                >
                    Atrás
                </button>
                {cursor < stepIds.length - 1 && (
                    <button type="button" className="btn-secondary" onClick={() => setCursor(c => c + 1)}>
                        Siguiente
                    </button>
                )}
            </div>
        </div>
    )
}
