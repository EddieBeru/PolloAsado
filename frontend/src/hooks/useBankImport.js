import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getBankParser } from '../lib/bankImport/banks'
import { BankFileParseError } from '../lib/bankImport/errors'
import { normalizeDescripcion } from '../lib/bankImport/normalize'
import { findManualMatches, findDoubleCharges } from '../lib/bankImport/dedupe'
import { suggestCategory } from '../lib/bankImport/categorize'

export function useBankImport(user) {
    const [status, setStatus] = useState('idle')
    const [rows, setRows] = useState([])
    const [error, setError] = useState(null)
    const [summary, setSummary] = useState(null)

    const reset = useCallback(() => {
        setStatus('idle')
        setRows([])
        setError(null)
        setSummary(null)
    }, [])

    const loadFile = useCallback(async (file, reglas, bankId = 'bcr') => {
        setStatus('parsing')
        setError(null)
        setSummary(null)

        const parser = getBankParser(bankId)

        let html
        try {
            html = await file.text()
        } catch (err) {
            console.error('No se pudo leer el archivo:', err)
            setError('No se pudo leer el archivo. Intentá de nuevo.')
            setStatus('idle')
            return
        }

        let movimientos
        try {
            movimientos = parser.parse(html)
        } catch (err) {
            if (err instanceof BankFileParseError) {
                setError(err.message)
            } else {
                console.error('Error inesperado parseando el archivo:', err)
                setError(`No pudimos leer este archivo — ¿es un export de movimientos de ${parser.label}?`)
            }
            setStatus('idle')
            return
        }

        if (movimientos.length === 0) {
            setError('Este archivo no tiene movimientos.')
            setStatus('idle')
            return
        }

        const fechasValidas = movimientos.filter(m => m.fecha).map(m => m.fecha).sort()
        const start = fechasValidas[0] || new Date().toISOString().split('T')[0]
        const end = fechasValidas[fechasValidas.length - 1] || start

        const [gastosRes, ingresosRes] = await Promise.all([
            supabase.from('gastos').select('id, monto, fecha').eq('user_id', user.id).is('documento_banco', null).gte('fecha', start).lte('fecha', end),
            supabase.from('ingresos').select('id, monto, fecha').eq('user_id', user.id).is('documento_banco', null).gte('fecha', start).lte('fecha', end)
        ])

        if (gastosRes.error || ingresosRes.error) {
            console.error('No se pudo comparar contra movimientos existentes:', gastosRes.error || ingresosRes.error)
            setError('No se pudo revisar duplicados contra lo ya registrado. Intentá de nuevo.')
            setStatus('idle')
            return
        }

        const existentes = [
            ...(gastosRes.data || []).map(g => ({ ...g, tipo: 'gasto', tabla: 'gastos' })),
            ...(ingresosRes.data || []).map(i => ({ ...i, tipo: 'ingreso', tabla: 'ingresos' }))
        ]

        const previewRows = movimientos.map(m => {
            const descripcionNormalizada = normalizeDescripcion(m.descripcion)
            return {
                ...m,
                id: crypto.randomUUID(),
                descripcionNormalizada,
                categoria: m.tipo ? (suggestCategory(descripcionNormalizada, m.tipo, reglas) || '') : '',
                incluir: !m.invalid,
                flagTipo: null,
                flagCandidatos: [],
                resolucion: null,
                recordarRegla: false
            }
        })

        const manualMatches = findManualMatches(previewRows, existentes)
        const doubleCharges = findDoubleCharges(previewRows)

        for (const row of previewRows) {
            const manual = manualMatches.get(row.id)
            if (manual && manual.length > 0) {
                row.flagTipo = 'ya_existe'
                row.flagCandidatos = manual
                continue
            }
            const doubles = doubleCharges.get(row.id)
            if (doubles && doubles.length > 0) {
                row.flagTipo = 'cargo_doble'
                row.flagCandidatos = doubles
            }
        }

        setRows(previewRows)
        setStatus('ready')
    }, [user])

    const updateRow = useCallback((id, patch) => {
        setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
    }, [])

    const canConfirm = rows.length > 0 && rows.every(r => {
        if (!r.incluir) return true
        if (r.flagTipo && !r.resolucion) return false
        if (r.tipo === 'gasto' && !r.categoria) return false
        return true
    })

    const confirmImport = useCallback(async (saveRegla) => {
        setStatus('confirming')
        let creados = 0
        let vinculados = 0
        let omitidos = 0
        let fallidos = 0

        for (const row of rows) {
            if (!row.incluir || row.resolucion === 'omitir') {
                omitidos++
                continue
            }

            if (row.flagTipo === 'ya_existe' && row.resolucion === 'vincular') {
                const target = row.flagCandidatos[0]
                const { error } = await supabase
                    .from(target.tabla)
                    .update({ documento_banco: row.documento })
                    .eq('id', target.id)
                if (error) {
                    console.error('No se pudo vincular el movimiento:', error)
                    fallidos++
                } else {
                    vinculados++
                }
                continue
            }

            const tabla = row.tipo === 'gasto' ? 'gastos' : 'ingresos'
            const payload = {
                id: crypto.randomUUID(),
                user_id: user.id,
                monto: row.monto,
                descripcion: row.descripcion,
                categoria: row.categoria || null,
                fecha: row.fecha,
                es_recurrente: false,
                origen: 'importado',
                documento_banco: row.documento
            }
            if (tabla === 'gastos') payload.es_fijo = false

            const { error } = await supabase.from(tabla).insert([payload])
            if (error) {
                console.error('No se pudo importar un movimiento:', error)
                fallidos++
                continue
            }
            creados++

            if (row.recordarRegla && row.categoria) {
                await saveRegla(row.descripcionNormalizada, row.categoria, row.tipo)
            }
        }

        setSummary({ creados, vinculados, omitidos, fallidos })
        setStatus('done')
    }, [rows, user])

    return { status, rows, error, summary, canConfirm, loadFile, updateRow, confirmImport, reset }
}
