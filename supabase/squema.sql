-- Perfiles de usuario (extiende el auth de Supabase)
CREATE TABLE perfiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nombre TEXT,
  preferencias JSONB DEFAULT '{"categorias_ingreso": [], "categorias_gasto": [], "tema": "slate", "divisa_principal": "CRC", "divisas_activas": ["CRC", "USD"]}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingresos: cuánto y cuándo
CREATE TABLE ingresos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  descripcion TEXT,
  categoria TEXT,
  fecha DATE NOT NULL,
  es_recurrente BOOLEAN DEFAULT FALSE,
  frecuencia TEXT, -- 'mensual', 'quincenal', 'semanal'
  limite_recurrencia INT,
  divisa_original TEXT,
  monto_original DECIMAL(12,2),
  tasa_cambio DECIMAL(12,6),
  grupo_recurrencia UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gastos: fijos y variables
CREATE TABLE gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  descripcion TEXT NOT NULL,
  categoria TEXT NOT NULL, -- 'comida', 'transporte', 'hormiga', etc.
  lugar TEXT,
  fecha DATE NOT NULL,
  es_fijo BOOLEAN DEFAULT FALSE,
  es_recurrente BOOLEAN DEFAULT FALSE,
  frecuencia TEXT, -- 'mensual', 'semanal', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deudas: con todo lo del brainstorming
CREATE TABLE deudas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  descripcion TEXT NOT NULL,
  monto_total DECIMAL(12,2) NOT NULL,
  monto_pagado DECIMAL(12,2) DEFAULT 0,
  cuota_mensual DECIMAL(12,2),
  tasa_interes DECIMAL(5,2) DEFAULT 0, -- porcentaje
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Abonos a deudas
CREATE TABLE abonos_deuda (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deuda_id UUID REFERENCES deudas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  fecha DATE NOT NULL,
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ahorros
CREATE TABLE ahorros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  nombre TEXT NOT NULL, -- 'Fondo de emergencia', 'Vacaciones'
  monto_meta DECIMAL(12,2),
  monto_actual DECIMAL(12,2) DEFAULT 0,
  es_automatico BOOLEAN DEFAULT FALSE,
  frecuencia TEXT,
  monto_automatico DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Presupuesto mensual por categoría
CREATE TABLE presupuestos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  categoria TEXT NOT NULL,
  monto_limite DECIMAL(12,2) NOT NULL,
  mes INT NOT NULL,   -- 1-12
  anio INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Desglose para Ingresos
CREATE TABLE desglose_ingresos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingreso_id UUID REFERENCES ingresos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  descripcion TEXT NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  es_deduccion BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Desglose para Gastos
CREATE TABLE desglose_gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gasto_id UUID REFERENCES gastos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  descripcion TEXT NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  es_deduccion BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Capa de estadísticas (agregación server-side).
-- Definida en migración 20260705120000_create_stats_rpcs.sql:
--   Funciones SECURITY INVOKER (respetan RLS auth.uid() = user_id):
--     get_balance(p_hasta date)                                 -> total_ingresos, total_gastos, balance (fecha <= p_hasta)
--     get_range_totals(p_start date, p_end date)                -> totales en un rango arbitrario
--     get_income_expense_series(p_start, p_end, p_granularity)  -> serie por periodo (day|week|month|year), shape Recharts
--     get_totals_by_category(p_tipo, p_start, p_end)            -> total y cantidad por categoría (ingreso|gasto)
--     get_top_categories(p_tipo, p_limit, p_start, p_end)       -> top-N categorías
--   Índices: idx_ingresos_user_fecha (ingresos user_id, fecha), idx_gastos_user_fecha (gastos user_id, fecha)