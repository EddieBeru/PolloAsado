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

-- RLS Policies
ALTER TABLE desglose_ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE desglose_gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_solo_ve_los_suyos" ON desglose_ingresos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "usuario_solo_ve_los_suyos" ON desglose_gastos FOR ALL USING (auth.uid() = user_id);
