-- Gastos fijos: día esperado del mes y agrupación entre instancias mensuales
-- (mismo patrón que ingresos.grupo_recurrencia).
ALTER TABLE gastos ADD COLUMN dia_esperado INT;
ALTER TABLE gastos ADD COLUMN grupo_recurrencia UUID;

-- perfiles tenía RLS activo sin ninguna policy: ninguna fila era legible ni
-- escribible desde el cliente. Sin esto, la sección de baldes en Ajustes no
-- puede leer ni guardar nada.
CREATE POLICY "usuario_solo_ve_el_suyo" ON perfiles FOR ALL USING (auth.uid() = id);

-- Default de categoria_baldes/porcentajes_balde para perfiles nuevos.
ALTER TABLE perfiles ALTER COLUMN preferencias SET DEFAULT '{
  "categorias_ingreso": [], "categorias_gasto": [], "tema": "slate",
  "divisa_principal": "CRC", "divisas_activas": ["CRC", "USD"],
  "categoria_baldes": {
    "Vivienda": "necesidad", "Servicios": "necesidad", "Salud": "necesidad",
    "Transporte": "necesidad", "Alimentación": "necesidad",
    "Entretenimiento": "gusto", "Ropa": "gusto", "Educación": "gusto", "Otros": "gusto"
  },
  "porcentajes_balde": { "necesidad": 50, "gusto": 30, "ahorro": 20 }
}'::jsonb;

-- Perfiles ya existentes reciben las claves nuevas sin pisar lo que ya tengan.
UPDATE perfiles
SET preferencias = preferencias || '{"categoria_baldes": {
  "Vivienda":"necesidad","Servicios":"necesidad","Salud":"necesidad",
  "Transporte":"necesidad","Alimentación":"necesidad","Entretenimiento":"gusto",
  "Ropa":"gusto","Educación":"gusto","Otros":"gusto"
}}'::jsonb
WHERE NOT (preferencias ? 'categoria_baldes');

UPDATE perfiles
SET preferencias = preferencias || '{"porcentajes_balde": {"necesidad": 50, "gusto": 30, "ahorro": 20}}'::jsonb
WHERE NOT (preferencias ? 'porcentajes_balde');
