-- Origen y folio bancario en gastos e ingresos. El índice único parcial es la
-- garantía real contra reimportar el mismo movimiento — no depende solo de la UI.
ALTER TABLE gastos ADD COLUMN origen TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE gastos ADD COLUMN documento_banco TEXT;
CREATE UNIQUE INDEX idx_gastos_documento_banco ON gastos (user_id, documento_banco) WHERE documento_banco IS NOT NULL;

ALTER TABLE ingresos ADD COLUMN origen TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE ingresos ADD COLUMN documento_banco TEXT;
CREATE UNIQUE INDEX idx_ingresos_documento_banco ON ingresos (user_id, documento_banco) WHERE documento_banco IS NOT NULL;

-- Reglas de categorización aprendidas de imports pasados.
CREATE TABLE reglas_categorizacion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  patron TEXT NOT NULL,
  categoria TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'gasto' | 'ingreso'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, patron, tipo)
);

ALTER TABLE reglas_categorizacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario_solo_ve_los_suyos" ON reglas_categorizacion
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
