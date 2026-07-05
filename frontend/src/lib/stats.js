import { supabase } from './supabaseClient'

// PostgREST serializa DECIMAL como string; normalizamos a número.
const num = (v) => Number(v ?? 0)

// Balance general hasta una fecha (default hoy en el servidor).
// -> { totalIngresos, totalGastos, balance }
export async function fetchBalance({ hasta = null } = {}) {
  const { data, error } = await supabase.rpc('get_balance', hasta ? { p_hasta: hasta } : {})
  if (error) throw error
  const r = data?.[0] ?? {}
  return {
    totalIngresos: num(r.total_ingresos),
    totalGastos: num(r.total_gastos),
    balance: num(r.balance),
  }
}

// Totales en un rango arbitrario. -> { totalIngresos, totalGastos, balance }
export async function fetchRangeTotals({ start = null, end = null } = {}) {
  const { data, error } = await supabase.rpc('get_range_totals', { p_start: start, p_end: end })
  if (error) throw error
  const r = data?.[0] ?? {}
  return {
    totalIngresos: num(r.total_ingresos),
    totalGastos: num(r.total_gastos),
    balance: num(r.balance),
  }
}

// Serie temporal ingreso-vs-gasto. granularity: 'day'|'week'|'month'|'year'.
// -> [{ periodo, ingresos, gastos, balance }] listo para <ComposedChart data={...}>.
export async function fetchIncomeExpenseSeries({ start = null, end = null, granularity = 'month' } = {}) {
  const { data, error } = await supabase.rpc('get_income_expense_series', {
    p_start: start,
    p_end: end,
    p_granularity: granularity,
  })
  if (error) throw error
  return (data ?? []).map((r) => ({
    periodo: r.periodo,
    ingresos: num(r.ingresos),
    gastos: num(r.gastos),
    balance: num(r.balance),
  }))
}

// Totales por categoría. tipo: 'ingreso'|'gasto'. -> [{ categoria, total, cantidad }].
export async function fetchTotalsByCategory({ tipo, start = null, end = null }) {
  const { data, error } = await supabase.rpc('get_totals_by_category', {
    p_tipo: tipo,
    p_start: start,
    p_end: end,
  })
  if (error) throw error
  return (data ?? []).map((r) => ({
    categoria: r.categoria,
    total: num(r.total),
    cantidad: Number(r.cantidad),
  }))
}

// Top-N categorías. tipo: 'ingreso'|'gasto'. -> [{ categoria, total, cantidad }].
export async function fetchTopCategories({ tipo, limit = 5, start = null, end = null }) {
  const { data, error } = await supabase.rpc('get_top_categories', {
    p_tipo: tipo,
    p_limit: limit,
    p_start: start,
    p_end: end,
  })
  if (error) throw error
  return (data ?? []).map((r) => ({
    categoria: r.categoria,
    total: num(r.total),
    cantidad: Number(r.cantidad),
  }))
}
