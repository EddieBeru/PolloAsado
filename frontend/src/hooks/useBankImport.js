import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getBankParser } from '../lib/bankImport/banks'
import { BankFileParseError } from '../lib/bankImport/errors'
import { normalizeDescripcion } from '../lib/bankImport/normalize'
import { findManualMatches, findDoubleCharges, findAlreadyImported } from '../lib/bankImport/dedupe'
import { suggestCategory, buildMerchantMap } from '../lib/bankImport/categorize'
import { pendingWizardRows } from '../lib/bankImport/wizardSteps'
import { fetchTotalsByCategory } from '../lib/stats'

const EMPTY_CATEGORY_HINTS = {
    merchantMap: { gasto: new Map(), ingreso: new Map() },
    frecuencias: { gasto: [], ingreso: [] }
}

export function useBankImport(user) {
    const [status, setStatus] = useState('idle')
    const [rows, setRows] = useState([])
    const [error, setError] = useState(null)
    const [summary, setSummary] = useState(null)
    const [categoryHints, setCategoryHints] = useState(EMPTY_CATEGORY_HINTS)

    const reset = useCallback(() => {
        setStatus('idle')
        setRows([])
        setError(null)
        setSummary(null)
        setCategoryHints(EMPTY_CATEGORY_HINTS)
    }, [])

    const loadFile = useCallback(async (file, reglas, cuentaId, bankId = 'bcr') => {
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
        const documentosArchivo = [...new Set(movimientos.filter(m => m.documento).map(m => m.documento))]

        const [
            gastosRes, ingresosRes,
            gastosDocRes, ingresosDocRes,
            gastosHistRes, ingresosHistRes,
            frecGastoRes, frecIngresoRes
        ] = await Promise.all([
            supabase.from('gastos').select('id, monto, fecha').eq('user_id', user.id).eq('cuenta_id', cuentaId).is('documento_banco', null).gte('fecha', start).lte('fecha', end),
            supabase.from('ingresos').select('id, monto, fecha').eq('user_id', user.id).eq('cuenta_id', cuentaId).is('documento_banco', null).gte('fecha', start).lte('fecha', end),
            documentosArchivo.length > 0
                ? supabase.from('gastos').select('documento_banco').eq('user_id', user.id).in('documento_banco', documentosArchivo)
                : Promise.resolve({ data: [], error: null }),
            documentosArchivo.length > 0
                ? supabase.from('ingresos').select('documento_banco').eq('user_id', user.id).in('documento_banco', documentosArchivo)
                : Promise.resolve({ data: [], error: null }),
            supabase.from('gastos').select('descripcion, categoria').eq('user_id', user.id).order('fecha', { ascending: false }).limit(300),
            supabase.from('ingresos').select('descripcion, categoria').eq('user_id', user.id).order('fecha', { ascending: false }).limit(300),
            fetchTotalsByCategory({ tipo: 'gasto' }).catch(err => { console.error('No se pudieron traer las categorías más usadas:', err); return [] }),
            fetchTotalsByCategory({ tipo: 'ingreso' }).catch(err => { console.error('No se pudieron traer las categorías más usadas:', err); return [] })
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

        const documentosYaImportados = new Set([
            ...(gastosDocRes.data || []).map(g => g.documento_banco),
            ...(ingresosDocRes.data || []).map(i => i.documento_banco)
        ])

        setCategoryHints({
            merchantMap: {
                gasto: buildMerchantMap(gastosHistRes.data || []),
                ingreso: buildMerchantMap(ingresosHistRes.data || [])
            },
            frecuencias: {
                gasto: [...frecGastoRes].sort((a, b) => b.cantidad - a.cantidad),
                ingreso: [...frecIngresoRes].sort((a, b) => b.cantidad - a.cantidad)
            }
        })

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

        const yaImportados = findAlreadyImported(previewRows, documentosYaImportados)
        const manualMatches = findManualMatches(previewRows, existentes)
        const doubleCharges = findDoubleCharges(previewRows)

        for (const row of previewRows) {
            if (yaImportados.has(row.id)) {
                row.flagTipo = 'ya_importado'
                row.incluir = false
                continue
            }
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
        if (r.tipo === 'gasto' && !r.categoria && r.resolucion !== 'vincular') return false
        return true
    })

    const confirmImport = useCallback(async (saveRegla, cuentaId, { onlyResolved = false } = {}) => {
        setStatus('confirming')
        const targetRows = onlyResolved ? rows.filter(r => pendingWizardRows([r]).length === 0) : rows
        let creados = 0
        let vinculados = 0
        let omitidos = 0
        let yaImportados = 0
        let fallidos = 0

        for (const row of targetRows) {
            if (row.flagTipo === 'ya_importado') {
                yaImportados++
                continue
            }
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
                documento_banco: row.documento,
                cuenta_id: cuentaId
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

        setSummary({ creados, vinculados, omitidos, yaImportados, fallidos })
        setStatus('done')
    }, [rows, user])

    return { status, rows, error, summary, canConfirm, categoryHints, loadFile, updateRow, confirmImport, reset }
}
