-- Añadir preferencias al perfil de usuario
ALTER TABLE perfiles ADD COLUMN preferencias JSONB DEFAULT '{"categorias_ingreso": [], "categorias_gasto": [], "tema": "slate"}'::jsonb;
