-- Activar RLS en cada tabla
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE deudas ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonos_deuda ENABLE ROW LEVEL SECURITY;
ALTER TABLE ahorros ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE desglose_ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE desglose_gastos ENABLE ROW LEVEL SECURITY;

-- Policy temporal: cada usuario ve y modifica solo sus datos
CREATE POLICY "usuario_solo_ve_los_suyos" ON ingresos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "usuario_solo_ve_los_suyos" ON gastos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "usuario_solo_ve_los_suyos" ON deudas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "usuario_solo_ve_los_suyos" ON abonos_deuda FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "usuario_solo_ve_los_suyos" ON ahorros FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "usuario_solo_ve_los_suyos" ON presupuestos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "usuario_solo_ve_los_suyos" ON desglose_ingresos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "usuario_solo_ve_los_suyos" ON desglose_gastos FOR ALL USING (auth.uid() = user_id);