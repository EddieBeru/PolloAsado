import { useState, useEffect, useRef } from 'react'
import localforage from 'localforage'
import { supabase } from '../lib/supabaseClient'

// Ventana de fecha inicial (meses hacia atrás). loadMore() la amplía.
const DEFAULT_MONTHS_BACK = 6

// Primer día del mes hace `n` meses, formato 'YYYY-MM-DD'.
const monthsAgoStart = (n) => {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - n)
  return d.toISOString().split('T')[0]
}

export function useIncomes(user) {
  const [incomes, setIncomes] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  // Ventana de fecha actual (en un ref para leerla desde callbacks sin re-crearlos).
  const monthsBackRef = useRef(DEFAULT_MONTHS_BACK)
  const [windowStart, setWindowStart] = useState(monthsAgoStart(DEFAULT_MONTHS_BACK))

  // Instancia de localforage para ingresos
  const incomesStore = localforage.createInstance({
    name: 'PolloAsado',
    storeName: 'incomes'
  })

  // 1. Carga inicial rápida desde caché local
  const loadLocalData = async () => {
    const localData = (await incomesStore.getItem('incomes_list')) || []
    setIncomes(localData)
    setLoading(false)
    return localData
  }

  // PULL: traer la ventana fresca de Supabase y mergear preservando pendientes.
  // No hace PUSH, así loadMore() no re-envía items pendientes.
  const pullRemote = async (monthsBack) => {
    if (!user) return
    const start = monthsAgoStart(monthsBack)

    const { data: remoteIncomes, error: fetchError } = await supabase
      .from('ingresos')
      .select(`
        *,
        desglose:desglose_ingresos(id, descripcion, monto, es_deduccion)
      `)
      .eq('user_id', user.id)
      .gte('fecha', start)
      .order('fecha', { ascending: false })

    if (fetchError || !remoteIncomes) return

    const formattedRemote = remoteIncomes.map(item => ({
      ...item,
      concept: item.descripcion,
      amount: item.monto,
      date: item.fecha,
      category: item.categoria,
      es_recurrente: item.es_recurrente,
      frecuencia: item.frecuencia,
      limite_recurrencia: item.limite_recurrencia,
      grupo_recurrencia: item.grupo_recurrencia,
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

    // Preservar items locales aún pendientes que no vinieron en la página remota
    // (ej. fuera de la ventana, o insertados/editados sin sincronizar todavía).
    const localData = (await incomesStore.getItem('incomes_list')) || []
    const remoteIds = new Set(formattedRemote.map(r => r.id))
    const pendingKept = localData.filter(l => l._isPendingSync && !remoteIds.has(l.id))
    const merged = [...pendingKept, ...formattedRemote]

    await incomesStore.setItem('incomes_list', merged)
    setIncomes(merged)
    setWindowStart(start)
  }

  // 2. Lógica de Sincronización en Background (PUSH pendientes + PULL fresco)
  const syncWithSupabase = async (localData) => {
    if (!user) return
    setIsSyncing(true)

    try {
      // -- A. PUSH: Enviar elementos pendientes --
      const pendingItems = localData.filter(item => item._isPendingSync)

      for (const item of pendingItems) {
        const syncType = item._isPendingSync
        // Extraemos solo lo que va a la tabla de ingresos (_deltaBase es solo local)
        const { _isPendingSync, _deltaBase, desglose, concept, amount, date, category, account, notes, grupo_recurrencia, ...dbIncomeData } = item

        // Agregar grupo_recurrencia solo si existe
        if (grupo_recurrencia) dbIncomeData.grupo_recurrencia = grupo_recurrencia

        if (syncType === 'UPDATE_SINGLE' || syncType === 'UPDATE_SERIES') {
          const { error: updateError } = await supabase
            .from('ingresos')
            .update(dbIncomeData)
            .eq('id', item.id)

          if (updateError) {
            console.error('Error actualizando ingreso:', updateError)
            continue
          }

          // Eliminar desglose anterior e insertar el nuevo
          await supabase.from('desglose_ingresos').delete().eq('ingreso_id', item.id)

          if (desglose && desglose.length > 0) {
            const desgloseData = desglose.map(sub => ({
              id: sub.id,
              ingreso_id: item.id,
              user_id: user.id,
              descripcion: sub.descripcion,
              monto: sub.monto,
              es_deduccion: sub.operacion === 'resta'
            }))
            await supabase.from('desglose_ingresos').insert(desgloseData)
          }
        } else {
          // Creamos un objeto limpio SOLO con las columnas que existen en Supabase
          const cleanInsertData = {
            id: item.id,
            user_id: user.id,
            monto: item.monto,
            descripcion: item.descripcion,
            categoria: item.categoria || null,
            fecha: item.fecha,
            es_recurrente: item.es_recurrente || false,
            frecuencia: item.frecuencia || null,
            limite_recurrencia: item.limite_recurrencia || null,
            grupo_recurrencia: item.grupo_recurrencia || null,
            divisa_original: item.divisa_original || null,
            monto_original: item.monto_original || null,
            tasa_cambio: item.tasa_cambio || null
          }

          const { error: insertError } = await supabase
            .from('ingresos')
            .insert([cleanInsertData])

          if (insertError) {
            console.error('Error insertando ingreso:', insertError.message, insertError.details)
            continue
          }

          // Insertar desglose si existe
          if (desglose && desglose.length > 0) {
            const desgloseData = desglose.map(sub => ({
              id: sub.id,
              ingreso_id: item.id,
              user_id: user.id,
              descripcion: sub.descripcion,
              monto: sub.monto,
              es_deduccion: sub.operacion === 'resta'
            }))
            await supabase.from('desglose_ingresos').insert(desgloseData)
          }
        }
      }

      // -- B. PULL: Traer datos frescos de Supabase (ventana actual) --
      await pullRemote(monthsBackRef.current)

    } catch (error) {
      console.error('Fallo en sincronización:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  // Ampliar la ventana de fecha y volver a jalar (sin re-PUSH).
  const loadMore = async () => {
    monthsBackRef.current += DEFAULT_MONTHS_BACK
    await pullRemote(monthsBackRef.current)
  }

  // Ejecutar carga local y luego sync
  useEffect(() => {
    let isMounted = true
    monthsBackRef.current = DEFAULT_MONTHS_BACK
    loadLocalData().then(localData => {
      if (isMounted) syncWithSupabase(localData)
    })
    return () => { isMounted = false }
  }, [user])

  // 3. Crear ingreso (Push Optimista)
  const addIncome = async (formData) => {
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

    // Si es recurrente, tiene límite y personalizó (o auto-calculó) fechas
    if (formData.es_recurrente && formData.limite_recurrencia && formData.fechas_proyectadas && formData.fechas_proyectadas.length > 0) {
      const grupoId = crypto.randomUUID()

      newItems = formData.fechas_proyectadas.map(fechaProyectada => {
        return {
          // Datos DB
          id: crypto.randomUUID(),
          user_id: user.id,
          monto: finalAmount,
          descripcion: formData.concept,
          categoria: formData.category || null,
          fecha: fechaProyectada,
          es_recurrente: true, // Conservamos la etiqueta para la UI
          frecuencia: formData.frecuencia,
          limite_recurrencia: parseInt(formData.limite_recurrencia, 10),
          grupo_recurrencia: grupoId,
          divisa_original: formData.divisa_original,
          monto_original: originalAmount,
          tasa_cambio: rate,

          // Datos UI
          concept: formData.concept,
          amount: finalAmount,
          date: fechaProyectada,
          category: formData.category,
          es_recurrente: true,
          frecuencia: formData.frecuencia,
          limite_recurrencia: parseInt(formData.limite_recurrencia, 10),
          grupo_recurrencia: grupoId,
          divisa_original: formData.divisa_original,
          monto_original: originalAmount,
          tasa_cambio: rate,
          desglose: mappedDesglose.map(d => ({...d, id: crypto.randomUUID()})), // Clonamos UUIDs por si acaso
          _isPendingSync: true,
          _deltaBase: 0 // INSERT: el baseline del servidor tenía 0
        }
      })
    } else {
      // Ingreso normal o Recurrente Infinito (Registro Maestro)
      const masterGroupId = formData.es_recurrente ? crypto.randomUUID() : null

      newItems = [{
        // Datos DB
        id: crypto.randomUUID(),
        user_id: user.id,
        monto: finalAmount,
        descripcion: formData.concept,
        categoria: formData.category || null,
        fecha: formData.date,
        es_recurrente: formData.es_recurrente || false,
        frecuencia: formData.es_recurrente ? formData.frecuencia : null,
        limite_recurrencia: formData.es_recurrente && formData.limite_recurrencia ? parseInt(formData.limite_recurrencia, 10) : null,
        grupo_recurrencia: masterGroupId,
        divisa_original: formData.divisa_original,
        monto_original: originalAmount,
        tasa_cambio: rate,

        // Datos UI
        concept: formData.concept,
        amount: finalAmount,
        date: formData.date,
        category: formData.category,
        es_recurrente: formData.es_recurrente,
        frecuencia: formData.frecuencia,
        limite_recurrencia: formData.limite_recurrencia,
        grupo_recurrencia: masterGroupId,
        divisa_original: formData.divisa_original,
        monto_original: originalAmount,
        tasa_cambio: rate,
        desglose: mappedDesglose,
        _isPendingSync: true,
        _deltaBase: 0 // INSERT: el baseline del servidor tenía 0
      }]
    }

    const updatedIncomes = [...newItems, ...incomes]

    // Optimistic Update
    setIncomes(updatedIncomes)
    await incomesStore.setItem('incomes_list', updatedIncomes)

    // Lanzar sync al background sin esperar
    syncWithSupabase(updatedIncomes)
  }

  // 4. Actualizar ingreso existente (Optimistic Update)
  const updateIncome = async (id, formData, updateMode) => {
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

    const targetIncome = incomes.find(inc => inc.id === id)
    if (!targetIncome) return

    let updatedIncomes = [...incomes]

    // _deltaBase: monto ya reflejado en el baseline del servidor.
    // - si el item aún estaba pendiente, conserva su base previa (0 para inserts).
    // - si ya estaba sincronizado, la base es su monto viejo (antes de editar).
    const deltaBaseFor = (inc) => inc._isPendingSync ? (inc._deltaBase ?? 0) : parseFloat(inc.amount || 0)

    if (updateMode === 'series' && targetIncome.grupo_recurrencia) {
      updatedIncomes = updatedIncomes.map(inc => {
        if (inc.grupo_recurrencia === targetIncome.grupo_recurrencia) {
          return {
            ...inc,
            monto: finalAmount,
            descripcion: formData.concept,
            categoria: formData.category || null,
            divisa_original: formData.divisa_original,
            monto_original: originalAmount,
            tasa_cambio: rate,

            concept: formData.concept,
            amount: finalAmount,
            category: formData.category,
            // clonamos UUIDs para el desglose en cada iteración por seguridad DB
            desglose: mappedDesglose.map(d => ({...d, id: crypto.randomUUID()})),
            _deltaBase: deltaBaseFor(inc),
            _isPendingSync: inc._isPendingSync === true ? true : 'UPDATE_SERIES'
          }
        }
        return inc
      })
    } else {
      updatedIncomes = updatedIncomes.map(inc => {
        if (inc.id === id) {
          return {
            ...inc,
            monto: finalAmount,
            descripcion: formData.concept,
            categoria: formData.category || null,
            fecha: formData.date,
            divisa_original: formData.divisa_original,
            monto_original: originalAmount,
            tasa_cambio: rate,

            concept: formData.concept,
            amount: finalAmount,
            date: formData.date,
            category: formData.category,
            desglose: mappedDesglose,
            _deltaBase: deltaBaseFor(inc),
            _isPendingSync: inc._isPendingSync === true ? true : 'UPDATE_SINGLE'
          }
        }
        return inc
      })
    }

    setIncomes(updatedIncomes)
    await incomesStore.setItem('incomes_list', updatedIncomes)
    syncWithSupabase(updatedIncomes)
  }

  return { incomes, loading, isSyncing, addIncome, updateIncome, loadMore, windowStart }
}
