import { useMemo } from 'react'
import { generarConsejos } from '../../lib/consejos'

export default function ConsejosCard({ baldes, metasAhorro = [], loading }) {
    const mensajes = useMemo(
        () => (baldes ? generarConsejos({ baldes, metasAhorro }) : []),
        [baldes, metasAhorro]
    )

    if (loading || mensajes.length === 0) return null

    return (
        <div className="card flex flex-col gap-3">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">Consejos</h3>
            {mensajes.map((m, i) => (
                <p key={i} className="text-sm text-text-primary">{m}</p>
            ))}
        </div>
    )
}
