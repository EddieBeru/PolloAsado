import { useRef, useState, useEffect, useMemo } from 'react'
import { useBankImport } from '../hooks/useBankImport'
import { useReglasCategorizacion } from '../hooks/useReglasCategorizacion'
import { useCuentas } from '../hooks/useCuentas'
import ImportPreviewTable from './Import/ImportPreviewTable'
import { Upload } from 'lucide-react'

export default function Import({ user }) {
    const { reglas, saveRegla } = useReglasCategorizacion(user)
    const { status, rows, error, summary, canConfirm, loadFile, updateRow, confirmImport, reset } = useBankImport(user)
    const { cuentas } = useCuentas(user)
    const cuentasActivas = useMemo(() => cuentas.filter(c => c.activa), [cuentas])
    const [cuentaId, setCuentaId] = useState('')
    const fileInputRef = useRef(null)

    useEffect(() => {
        if (cuentaId || cuentasActivas.length === 0) return
        const ultima = localStorage.getItem('polloasado_ultima_cuenta_id')
        const existe = ultima && cuentasActivas.some(c => c.id === ultima)
        setCuentaId(existe ? ultima : cuentasActivas[0].id)
    }, [cuentasActivas, cuentaId])

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        await loadFile(file, reglas)
        e.target.value = ''
    }

    const handleConfirm = async () => {
        localStorage.setItem('polloasado_ultima_cuenta_id', cuentaId)
        await confirmImport(saveRegla, cuentaId)
    }

    return (
        <div className="w-full flex-1 flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="heading">Importar movimientos</h2>
                {status !== 'idle' && (
                    <button type="button" className="btn-secondary" onClick={reset}>Empezar de nuevo</button>
                )}
            </div>

            {status === 'idle' && (
                <div className="card flex flex-col gap-4 items-start">
                    <p className="text-text-secondary">
                        Subí el archivo "Movimientos del día" que exportás desde la banca en línea de BCR.
                    </p>
                    <div className="flex flex-col gap-2 w-full max-w-xs">
                        <label htmlFor="cuenta_id" className="text-sm font-semibold text-text-secondary ml-1">Cuenta destino</label>
                        <select
                            id="cuenta_id"
                            value={cuentaId}
                            onChange={(e) => setCuentaId(e.target.value)}
                            className="input cursor-pointer"
                        >
                            {cuentasActivas.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xls,.html,text/html"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <button type="button" className="btn-primary" disabled={!cuentaId} onClick={() => fileInputRef.current?.click()}>
                        <Upload size={18} /> Subir archivo
                    </button>
                </div>
            )}

            {status === 'parsing' && <p className="text-text-secondary">Leyendo archivo…</p>}

            {error && <p className="notice-negative" role="alert">{error}</p>}

            {status === 'ready' && (
                <>
                    <ImportPreviewTable rows={rows} onUpdateRow={updateRow} />
                    <div className="flex items-center gap-4">
                        <button type="button" className="btn-primary" disabled={!canConfirm} onClick={handleConfirm}>
                            Confirmar import ({rows.filter(r => r.incluir).length})
                        </button>
                        {!canConfirm && <p className="text-xs text-text-secondary">Resolvé las filas marcadas y asigná categoría a los gastos antes de confirmar.</p>}
                    </div>
                </>
            )}

            {status === 'confirming' && <p className="text-text-secondary">Importando…</p>}

            {status === 'done' && summary && (
                <div className="notice-warning">
                    {summary.creados} movimientos importados, {summary.vinculados} vinculados a existentes, {summary.omitidos} omitidos
                    {summary.fallidos > 0 ? `, ${summary.fallidos} fallaron (revisá la consola y reintentá)` : ''}.
                </div>
            )}
        </div>
    )
}
