-- Cuentas (carteras): bancos, efectivo, tarjetas. Saldo se calcula, no se guarda.
CREATE TABLE cuentas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'banco', -- 'banco' | 'efectivo' | 'tarjeta' | 'otro'
  saldo_inicial DECIMAL(12,2) NOT NULL DEFAULT 0,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cuentas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_solo_ve_las_suyas" ON cuentas FOR ALL USING (auth.uid() = user_id);

-- Cuenta "General" para cada usuario con movimientos existentes, destino del backfill.
INSERT INTO cuentas (user_id, nombre, tipo)
SELECT DISTINCT user_id, 'General', 'banco'
FROM (
  SELECT user_id FROM gastos
  UNION
  SELECT user_id FROM ingresos
) usuarios_con_movimientos;

ALTER TABLE gastos ADD COLUMN cuenta_id UUID REFERENCES cuentas(id);
ALTER TABLE ingresos ADD COLUMN cuenta_id UUID REFERENCES cuentas(id);

UPDATE gastos g SET cuenta_id = c.id
FROM cuentas c
WHERE c.user_id = g.user_id AND c.nombre = 'General' AND g.cuenta_id IS NULL;

UPDATE ingresos i SET cuenta_id = c.id
FROM cuentas c
WHERE c.user_id = i.user_id AND c.nombre = 'General' AND i.cuenta_id IS NULL;

ALTER TABLE gastos ALTER COLUMN cuenta_id SET NOT NULL;
ALTER TABLE ingresos ALTER COLUMN cuenta_id SET NOT NULL;

CREATE INDEX idx_gastos_cuenta ON gastos (cuenta_id);
CREATE INDEX idx_ingresos_cuenta ON ingresos (cuenta_id);
