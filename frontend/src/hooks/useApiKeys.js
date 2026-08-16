import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useApiKeys(user) {
    const [keys, setKeys] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchKeys = useCallback(async () => {
        if (!user) {
            setKeys([])
            setLoading(false)
            return
        }
        setLoading(true)
        const { data, error: fetchError } = await supabase
            .from('api_keys')
            .select('id, label, last_used_at, revoked_at, created_at')
            .order('created_at', { ascending: false })

        if (fetchError) {
            console.error('No se pudieron traer las API keys:', fetchError)
            setError('No se pudieron cargar tus API keys.')
            setKeys([])
        } else {
            setError(null)
            setKeys(data || [])
        }
        setLoading(false)
    }, [user])

    useEffect(() => { fetchKeys() }, [fetchKeys])

    const crearKey = useCallback(async (label) => {
        const { data, error: rpcError } = await supabase
            .rpc('crear_api_key', { p_label: label })
            .single()

        if (rpcError) {
            console.error('No se pudo crear la API key:', rpcError)
            setError('No se pudo crear la API key.')
            return null
        }
        setError(null)
        await fetchKeys()
        return data.token
    }, [fetchKeys])

    const revocarKey = useCallback(async (keyId) => {
        const { error: rpcError } = await supabase.rpc('revocar_api_key', { p_key_id: keyId })
        if (rpcError) {
            console.error('No se pudo revocar la API key:', rpcError)
            setError('No se pudo revocar la API key.')
            return
        }
        setError(null)
        await fetchKeys()
    }, [fetchKeys])

    return { keys, loading, error, crearKey, revocarKey }
}
