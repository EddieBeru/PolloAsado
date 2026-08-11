import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

// Crea la cuenta "General" si el usuario todavía no tiene ninguna
// (usuarios nuevos, o migrados sin movimientos previos que dispararan el backfill).
const asegurarCuentaGeneral = async (userId) => {
    const { data, error } = await supabase
        .from('cuentas')
        .insert({ user_id: userId, nombre: 'General', tipo: 'banco' })
        .select('id')
        .single()

    if (error) {
        console.error('No se pudo crear la cuenta General:', error)
        return null
    }
    return data
}

export function useCuentas(user) {
    const [cuentas, setCuentas] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchCuentas = useCallback(async () => {
        if (!user) {
            setCuentas([])
            setLoading(false)
            return
        }
        setLoading(true)

        let { data, error: fetchError } = await supabase
            .from('cuentas')
            .select('id, nombre, tipo, saldo_inicial, activa, created_at')
            .order('created_at', { ascending: true })

        if (!fetchError && (!data || data.length === 0)) {
            await asegurarCuentaGeneral(user.id)
            ;({ data, error: fetchError } = await supabase
                .from('cuentas')
                .select('id, nombre, tipo, saldo_inicial, activa, created_at')
                .order('created_at', { ascending: true }))
        }

        if (fetchError) {
            console.error('No se pudieron traer las cuentas:', fetchError)
            setError('No se pudieron cargar tus cuentas.')
            setCuentas([])
            setLoading(false)
            return
        }

        const [{ data: gastos }, { data: ingresos }] = await Promise.all([
            supabase.from('gastos').select('cuenta_id, monto'),
            supabase.from('ingresos').select('cuenta_id, monto')
        ])

        const sumar = (rows) => (rows || []).reduce((acc, row) => {
            acc[row.cuenta_id] = (acc[row.cuenta_id] || 0) + parseFloat(row.monto || 0)
            return acc
        }, {})

        const totalGastos = sumar(gastos)
        const totalIngresos = sumar(ingresos)

        const conSaldo = (data || []).map(c => ({
            ...c,
            saldo: parseFloat(c.saldo_inicial || 0) + (totalIngresos[c.id] || 0) - (totalGastos[c.id] || 0)
        }))

        setError(null)
        setCuentas(conSaldo)
        setLoading(false)
    }, [user])

    useEffect(() => { fetchCuentas() }, [fetchCuentas])

    const crearCuenta = useCallback(async (nombre, tipo, saldoInicial = 0) => {
        const { error: insertError } = await supabase
            .from('cuentas')
            .insert({ user_id: user.id, nombre, tipo, saldo_inicial: saldoInicial })

        if (insertError) {
            console.error('No se pudo crear la cuenta:', insertError)
            setError('No se pudo crear la cuenta.')
            return false
        }
        setError(null)
        await fetchCuentas()
        return true
    }, [user, fetchCuentas])

    const editarCuenta = useCallback(async (id, cambios) => {
        const { error: updateError } = await supabase
            .from('cuentas')
            .update(cambios)
            .eq('id', id)

        if (updateError) {
            console.error('No se pudo editar la cuenta:', updateError)
            setError('No se pudo editar la cuenta.')
            return false
        }
        setError(null)
        await fetchCuentas()
        return true
    }, [fetchCuentas])

    const archivarCuenta = useCallback(async (id) => {
        return editarCuenta(id, { activa: false })
    }, [editarCuenta])

    return { cuentas, loading, error, crearCuenta, editarCuenta, archivarCuenta }
}
