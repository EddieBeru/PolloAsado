-- Agregar soporte multi-divisa a egresos
ALTER TABLE gastos ADD COLUMN divisa_original TEXT;
ALTER TABLE gastos ADD COLUMN monto_original DECIMAL(12,2);
ALTER TABLE gastos ADD COLUMN tasa_cambio DECIMAL(12,6);