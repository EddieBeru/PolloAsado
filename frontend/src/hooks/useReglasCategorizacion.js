import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useReglasCategorizacion(user) {
    const [reglas, setReglas] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchReglas = useCallback(async () => {
        if (!user) {
            setReglas([])
            setLoading(false)
            return
        }
        setLoading(true)
        const { data, error } = await supabase
            .from('reglas_categorizacion')
            .select('patron, categoria, tipo')
            .eq('user_id', user.id)

        if (error) {
            console.error('No se pudieron traer las reglas de categorización:', error)
            setReglas([])
        } else {
            setReglas(data || [])
        }
        setLoading(false)
    }, [user])

    useEffect(() => { fetchReglas() }, [fetchReglas])

    const saveRegla = useCallback(async (patron, categoria, tipo) => {
        if (!user) return
        const { error } = await supabase
            .from('reglas_categorizacion')
            .upsert(
                { user_id: user.id, patron, categoria, tipo },
                { onConflict: 'user_id,patron,tipo' }
            )
        if (error) {
            console.error('No se pudo guardar la regla de categorización:', error)
            return
        }
        await fetchReglas()
    }, [user, fetchReglas])

    return { reglas, loading, saveRegla }
}
