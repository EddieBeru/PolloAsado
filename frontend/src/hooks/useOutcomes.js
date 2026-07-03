import { useState, useEffect } from 'react'
import localforage from 'localforage'
import { supabase } from '../lib/supabaseClient'

export function useOutcomes(user) {
    const [outcomes, setOutcomes] = useState([])
    const [loading, setLoading] = useState(true)
    const [isSyncing, setIsSyncing] = useState(false)

    // Instancia de localforage para gastos
    const outcomesStore = localforage.createInstance({
        name: 'PolloAsado',
        storeName: 'outcomes'
    })

    // 1. Carga inicial rápida desde caché local
    const loadLocalData = async () => {
        const localData = (await outcomesStore.getItem('outcomes_list')) || []
        setOutcomes(localData)
        setLoading(false)
        return localData
    }

    // 2. Lógica de Sincronización en Background
    const syncWithSupabase = async (localData) => {
        if (!user) return
        setIsSyncing(true)

        try {
            // -- A. PUSH: Enviar elementos pendientes --
            const pendingItems = localData.filter(item => item._isPendingSync)

            for (const item of pendingItems) {
                const syncType = item._isPendingSync
                // Extraemos solo lo que va a la tabla de gastos
                const { _isPendingSync, desglose, concept, amount, date, category, account, notes, ...dbOutcomeData } = item

                if (syncType === 'UPDATE_SINGLE') {
                    const { error: updateError } = await supabase
                        .from('gastos')
                        .update(dbOutcomeData)
                        .eq('id', item.id)

                    if (updateError) {
                        console.error('Error actualizando gasto:', updateError)
                        continue
                    }

                    // Eliminar desglose anterior e insertar el nuevo
                    await supabase.from('desglose_gastos').delete().eq('gasto_id', item.id)

                    if (desglose && desglose.length > 0) {
                        const desgloseData = desglose.map(sub => ({
                            id: sub.id,
                            gasto_id: item.id,
                            user_id: user.id,
                            descripcion: sub.descripcion,
                            monto: sub.monto,
                            es_deduccion: sub.operacion === 'resta'
                        }))
                        await supabase.from('desglose_gastos').insert(desgloseData)
                    }
                } else {
                    // INSERT
                    const { error: insertError } = await supabase
                        .from('gastos')
                        .insert([dbOutcomeData])

                    if (insertError) {
                        console.error('Error insertando gasto:', insertError)
                        continue // Si falla, sigue intentando con los demás. Este se quedará pending.
                    }

                    // Insertar desglose si existe
                    if (desglose && desglose.length > 0) {
                        const desgloseData = desglose.map(sub => ({
                            id: sub.id,
                            gasto_id: item.id,
                            user_id: user.id,
                            descripcion: sub.descripcion,
                            monto: sub.monto,
                            es_deduccion: sub.operacion === 'resta'
                        }))
                        await supabase.from('desglose_gastos').insert(desgloseData)
                    }
                }
            }

            // -- B. PULL: Traer datos frescos de Supabase --
            const { data: remoteOutcomes, error: fetchError } = await supabase
                .from('gastos')
                .select(`
          *,
          desglose:desglose_gastos(id, descripcion, monto, es_deduccion)
        `)
                .eq('user_id', user.id)
                .order('fecha', { ascending: false })

            if (!fetchError && remoteOutcomes) {
                // Formatear los datos remotos para que la UI los entienda como antes
                const formattedRemote = remoteOutcomes.map(item => ({
                    ...item,
                    concept: item.descripcion,
                    amount: item.monto,
                    date: item.fecha,
                    category: item.categoria,
                    divisa_original: item.divisa_original,
                    monto_original: item.monto_original,
                    tasa_cambio: item.tasa_cambio,
                    // Mapear campos UI del desglose
                    desglose: item.desglose ? item.desglose.map(d => ({
                        id: d.id,
                        descripcion: d.descripcion,
                        monto: d.monto,
                        operacion: d.es_deduccion ? 'resta' : 'suma'
                    })) : [],
                    _isPendingSync: false // Ya están en Supabase
                }))

                await outcomesStore.setItem('outcomes_list', formattedRemote)
                setOutcomes(formattedRemote)
            }

        } catch (error) {
            console.error('Fallo en sincronización:', error)
        } finally {
            setIsSyncing(false)
        }
    }

    // Ejecutar carga local y luego sync
    useEffect(() => {
        let isMounted = true
        loadLocalData().then(localData => {
            if (isMounted) syncWithSupabase(localData)
        })
        return () => { isMounted = false }
    }, [user])

    // 3. Crear gasto (Push Optimista)
    const addOutcome = async (formData) => {
        if (!user) return

        // Para el desglose, asegurar que tengan UUID propio
        const mappedDesglose = formData.desglose.map(d => ({
            ...d,
            id: d.id || crypto.randomUUID()
        }))

        // Lógica Multi-divisa
        const baseCurrency = 'CRC' // Mantenemos la base coherente (idealmente se lee del contexto)
        let finalAmount = parseFloat(formData.amount)
        let originalAmount = null
        let rate = null

        if (formData.divisa_original !== baseCurrency && formData.tasa_cambio) {
            rate = parseFloat(formData.tasa_cambio)
            originalAmount = finalAmount
            finalAmount = finalAmount * rate
        }

        let newItems = []

        newItems = [{
            // Datos DB
            id: crypto.randomUUID(),
            user_id: user.id,
            monto: finalAmount,
            descripcion: formData.concept,
            categoria: formData.category,
            fecha: formData.date,
            divisa_original: formData.divisa_original,
            monto_original: originalAmount,
            tasa_cambio: rate,

            // Datos UI
            concept: formData.concept,
            amount: finalAmount,
            date: formData.date,
            category: formData.category,
            divisa_original: formData.divisa_original,
            monto_original: originalAmount,
            tasa_cambio: rate,
            desglose: mappedDesglose,
            _isPendingSync: true
        }]

        const updatedOutcomes = [...newItems, ...outcomes]

        // Optimistic Update
        setOutcomes(updatedOutcomes)
        await outcomesStore.setItem('outcomes_list', updatedOutcomes)

        // Lanzar sync al background sin esperar
        syncWithSupabase(updatedOutcomes)
    }

    // 4. Actualizar gasto existente (Optimistic Update)
    const updateOutcome = async (id, formData, updateMode) => {
        if (!user) return

        const mappedDesglose = formData.desglose.map(d => ({
            ...d,
            id: d.id || crypto.randomUUID()
        }))

        const baseCurrency = 'CRC'
        let finalAmount = parseFloat(formData.amount)
        let originalAmount = null
        let rate = null

        if (formData.divisa_original !== baseCurrency && formData.tasa_cambio) {
            rate = parseFloat(formData.tasa_cambio)
            originalAmount = finalAmount
            finalAmount = finalAmount * rate
        }

        const targetOutcome = outcomes.find(inc => inc.id === id)
        if (!targetOutcome) return

        let updatedOutcomes = [...outcomes]

        updatedOutcomes = updatedOutcomes.map(inc => {
            if (inc.id === id) {
                return {
                    ...inc,
                    monto: finalAmount,
                    descripcion: formData.concept,
                    categoria: formData.category,
                    fecha: formData.date,
                    divisa_original: formData.divisa_original,
                    monto_original: originalAmount,
                    tasa_cambio: rate,

                    concept: formData.concept,
                    amount: finalAmount,
                    date: formData.date,
                    category: formData.category,
                    desglose: mappedDesglose,
                    _isPendingSync: inc._isPendingSync === true ? true : 'UPDATE_SINGLE'
                }
            }
            return inc
        })

        setOutcomes(updatedOutcomes)
        await outcomesStore.setItem('outcomes_list', updatedOutcomes)
        syncWithSupabase(updatedOutcomes)
    }

    return { outcomes, loading, isSyncing, addOutcome, updateOutcome }
}
