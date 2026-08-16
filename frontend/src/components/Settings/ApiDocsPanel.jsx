import { useEffect } from 'react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const ENDPOINT = `${SUPABASE_URL}/rest/v1/rpc/agregar_movimiento`

const BODY_EJEMPLO = JSON.stringify({
    p_api_key: 'pk_tu_key_aquí',
    p_tipo: 'gasto',
    p_monto: 4500,
    p_descripcion: 'Uber',
    p_categoria: null,
    p_fecha: null,
    p_lugar: null,
    p_idempotency_key: 'un-id-unico-que-vos-generes'
}, null, 2)

const RESPUESTA_OK = JSON.stringify([
    { id: 'uuid-del-movimiento', categoria_asignada: 'Transporte', duplicado: false }
], null, 2)

const RESPUESTA_ERROR = JSON.stringify(
    { message: 'api key inválida o revocada' }, null, 2
)

function Bloque({ titulo, children }) {
    return (
        <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-text-secondary">{titulo}</span>
            {children}
        </div>
    )
}

function Codigo({ children }) {
    return (
        <pre className="bg-bg-app border border-border-app/50 rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
            {children}
        </pre>
    )
}

export default function ApiDocsPanel({ onClose }) {
    useEffect(() => {
        const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    return (
        <div
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="card flex flex-col gap-5 max-w-xl w-full max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="api-docs-title"
            >
                <div className="flex items-start justify-between gap-3 pb-2 border-b border-border-app/30">
                    <h3 id="api-docs-title" className="text-lg font-bold text-text-primary">Documentación de la API</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar documentación"
                        className="text-text-secondary hover:text-text-primary text-xl leading-none px-1"
                    >
                        ×
                    </button>
                </div>

                <p className="text-sm text-text-secondary leading-relaxed">
                    Para agregar un gasto o ingreso desde afuera de la app (Apple Shortcuts, Tasker,
                    cualquier cliente HTTP), llamá este endpoint con una de tus API keys.
                </p>

                <Bloque titulo="Endpoint">
                    <Codigo>POST {ENDPOINT}</Codigo>
                </Bloque>

                <Bloque titulo="Headers">
                    <Codigo>{`apikey: ${ANON_KEY}\nContent-Type: application/json`}</Codigo>
                </Bloque>

                <Bloque titulo="Body (JSON)">
                    <Codigo>{BODY_EJEMPLO}</Codigo>
                    <p className="text-xs text-text-secondary leading-relaxed">
                        Obligatorios: <code className="user-text">p_api_key</code>, <code className="user-text">p_tipo</code> (
                        <code className="user-text">"gasto"</code> o <code className="user-text">"ingreso"</code>),{' '}
                        <code className="user-text">p_monto</code> (mayor a 0), <code className="user-text">p_descripcion</code>.
                        Opcionales: <code className="user-text">p_categoria</code> (si se omite, se busca automáticamente),{' '}
                        <code className="user-text">p_fecha</code> (default hoy), <code className="user-text">p_lugar</code> (solo gastos),{' '}
                        <code className="user-text">p_idempotency_key</code> (evita duplicados si reintentás la misma llamada).
                    </p>
                    <p className="text-xs text-text-secondary leading-relaxed">
                        Nota: <code className="user-text">p_api_key</code> va en el body, no en un header — es tu key personal, distinta
                        del <code className="user-text">apikey</code> del header (que es pública del proyecto).
                    </p>
                </Bloque>

                <Bloque titulo="Respuesta exitosa (200)">
                    <Codigo>{RESPUESTA_OK}</Codigo>
                </Bloque>

                <Bloque titulo="Respuesta de error (400)">
                    <Codigo>{RESPUESTA_ERROR}</Codigo>
                </Bloque>

                <button type="button" onClick={onClose} className="btn-secondary self-end">Cerrar</button>
            </div>
        </div>
    )
}
