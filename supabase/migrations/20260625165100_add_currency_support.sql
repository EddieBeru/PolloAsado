-- Agregar soporte multi-divisa a ingresos
ALTER TABLE ingresos ADD COLUMN divisa_original TEXT;
ALTER TABLE ingresos ADD COLUMN monto_original DECIMAL(12,2);
ALTER TABLE ingresos ADD COLUMN tasa_cambio DECIMAL(12,6);

-- Actualizar valor default de preferencias en perfiles para incluir divisa
ALTER TABLE perfiles ALTER COLUMN preferencias SET DEFAULT '{"categorias_ingreso": [], "categorias_gasto": [], "tema": "slate", "divisa_principal": "MXN"}'::jsonb;
