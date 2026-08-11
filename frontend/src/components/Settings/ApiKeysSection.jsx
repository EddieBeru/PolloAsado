import { useState } from 'react'
import { useApiKeys } from '../../hooks/useApiKeys'
import ApiDocsPanel from './ApiDocsPanel'

export default function ApiKeysSection({ user }) {
    const { keys, loading, error, crearKey, revocarKey } = useApiKeys(user)
    const [label, setLabel] = useState('')
    const [nuevoToken, setNuevoToken] = useState(null)
    const [busy, setBusy] = useState(false)

    const handleGenerar = async (e) => {
        e.preventDefault()
        const nombre = label.trim()
        if (!nombre) return
        setBusy(true)
        const token = await crearKey(nombre)
        setBusy(false)
        if (token) {
            setNuevoToken(token)
            setLabel('')
        }
    }

    const handleRevocar = async (keyId, keyLabel) => {
        const confirmed = window.confirm(`¿Revocar la key "${keyLabel}"? Cualquier automatización que la use deja de funcionar.`)
        if (!confirmed) return
        await revocarKey(keyId)
    }

    return (
        <div className="card flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">API keys</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
                Generá una key para que automatizaciones externas (Apple Shortcuts, etc.) agreguen
                gastos e ingresos sin abrir la app.
            </p>

            {error && <p className="notice-negative" role="alert">{error}</p>}

            {nuevoToken && (
                <div className="notice-warning flex flex-col gap-2" role="status">
                    <span className="font-semibold">Copiá esta key ahora — no se vuelve a mostrar:</span>
                    <code className="user-text font-mono text-xs break-all bg-bg-app p-2 rounded">{nuevoToken}</code>
                    <button type="button" onClick={() => setNuevoToken(null)} className="btn-secondary self-start">Listo, ya la copié</button>
                </div>
            )}

            <form onSubmit={handleGenerar} className="flex gap-2">
                <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Nombre (ej. iPhone Shortcuts)"
                    maxLength={60}
                    className="input flex-1"
                />
                <button type="submit" disabled={busy} className="btn-primary px-4">
                    {busy ? 'Generando…' : 'Generar'}
                </button>
            </form>

            {loading ? (
                <div className="skeleton h-16 w-full" />
            ) : keys.length === 0 ? (
                <p className="text-sm text-text-secondary">Todavía no tenés ninguna API key.</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {keys.map(k => (
                        <div key={k.id} className="flex items-center justify-between gap-3 bg-surface-app/50 rounded-xl border border-border-app/30 p-3">
                            <div className="flex flex-col">
                                <span className="user-text text-sm font-semibold text-text-primary">{k.label}</span>
                                <span className="text-xs text-text-secondary">
                                    {k.revoked_at ? 'Revocada' : (k.last_used_at ? `Usada por última vez ${new Date(k.last_used_at).toLocaleDateString('es-CR')}` : 'Nunca usada')}
                                </span>
                            </div>
                            {!k.revoked_at && (
                                <button
                                    type="button"
                                    onClick={() => handleRevocar(k.id, k.label)}
                                    className="btn-danger px-3 py-1 text-xs"
                                >
                                    Revocar
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <ApiDocsPanel />
        </div>
    )
}
