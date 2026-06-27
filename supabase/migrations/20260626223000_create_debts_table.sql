CREATE TABLE debts(
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL, -- se trae las referencias de la base de datos de los usuarios registrados, y el NOT NULL evita que hayan deudas sin dueno 
    monto DECIMAL (12, 2)  NOT NULL, -- acepta decimales grandes
    fecha_limite DATE NOT NULL, 
    created_at TIMESTAMPTZ DEFAULT NOW()
);
    ALTER TABLE deudas ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "usuario_solo_ve_las_suyas_deudas" ON deudas
        FOR ALL
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);

