import { useState } from 'react'
import { useCuentas } from '../../hooks/useCuentas'
import { formatMoney } from '../../lib/format'

const TIPOS = [
    { value: 'banco', label: 'Banco' },
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'tarjeta', label: 'Tarjeta' },
    { value: 'otro', label: 'Otro' }
]

export default function CuentasSection({ user }) {
    const { cuentas, loading, error, crearCuenta, editarCuenta, archivarCuenta } = useCuentas(user)
    const [nombre, setNombre] = useState('')
    const [tipo, setTipo] = useState('banco')
    const [busy, setBusy] = useState(false)
    const [editandoId, setEditandoId] = useState(null)
    const [nombreEdit, setNombreEdit] = useState('')

    const activas = cuentas.filter(c => c.activa)
    const archivadas = cuentas.filter(c => !c.activa)

    const handleCrear = async (e) => {
        e.preventDefault()
        const nombreLimpio = nombre.trim()
        if (!nombreLimpio) return
        setBusy(true)
        const ok = await crearCuenta(nombreLimpio, tipo)
        setBusy(false)
        if (ok) setNombre('')
    }

    const iniciarEdicion = (c) => {
        setEditandoId(c.id)
        setNombreEdit(c.nombre)
    }

    const guardarEdicion = async (id) => {
        const nombreLimpio = nombreEdit.trim()
        if (!nombreLimpio) return
        await editarCuenta(id, { nombre: nombreLimpio })
        setEditandoId(null)
    }

    const handleArchivar = async (c) => {
        const confirmed = window.confirm(`¿Archivar la cuenta "${c.nombre}"? Deja de aparecer para movimientos nuevos, pero el histórico se conserva.`)
        if (!confirmed) return
        await archivarCuenta(c.id)
    }

    return (
        <div className="card flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">Cuentas</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
                Separá tus movimientos por cuenta bancaria, efectivo o tarjeta. El saldo se calcula solo.
            </p>

            {error && <p className="notice-negative" role="alert">{error}</p>}

            <form onSubmit={handleCrear} className="flex gap-2">
                <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre (ej. BCR Cuenta Corriente)"
                    maxLength={60}
                    className="input flex-1"
                />
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="input w-auto cursor-pointer">
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <button type="submit" disabled={busy} className="btn-primary px-4">
                    {busy ? 'Creando…' : 'Crear'}
                </button>
            </form>

            {loading ? (
                <div className="skeleton h-16 w-full" />
            ) : activas.length === 0 ? (
                <p className="text-sm text-text-secondary">Todavía no tenés ninguna cuenta.</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {activas.map(c => (
                        <div key={c.id} className="flex items-center justify-between gap-3 bg-surface-app/50 rounded-xl border border-border-app/30 p-3">
                            {editandoId === c.id ? (
                                <input
                                    type="text"
                                    value={nombreEdit}
                                    onChange={(e) => setNombreEdit(e.target.value)}
                                    onBlur={() => guardarEdicion(c.id)}
                                    onKeyDown={(e) => e.key === 'Enter' && guardarEdicion(c.id)}
                                    autoFocus
                                    className="input flex-1"
                                />
                            ) : (
                                <button type="button" onClick={() => iniciarEdicion(c)} className="flex flex-col text-left">
                                    <span className="user-text text-sm font-semibold text-text-primary">{c.nombre}</span>
                                    <span className="text-xs text-text-secondary">{formatMoney(c.saldo)}</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => handleArchivar(c)}
                                className="btn-danger px-3 py-1 text-xs"
                            >
                                Archivar
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {archivadas.length > 0 && (
                <details className="text-sm text-text-secondary">
                    <summary className="cursor-pointer">Cuentas archivadas ({archivadas.length})</summary>
                    <div className="flex flex-col gap-2 mt-2">
                        {archivadas.map(c => (
                            <div key={c.id} className="flex items-center justify-between gap-3 bg-surface-app/30 rounded-xl border border-border-app/20 p-3">
                                <span className="user-text text-sm text-text-secondary">{c.nombre}</span>
                                <button type="button" onClick={() => editarCuenta(c.id, { activa: true })} className="btn-secondary px-3 py-1 text-xs">
                                    Reactivar
                                </button>
                            </div>
                        ))}
                    </div>
                </details>
            )}
        </div>
    )
}
