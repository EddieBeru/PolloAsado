CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- API keys por usuario, para autenticar llamadas externas (no sesión Supabase)
CREATE TABLE api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  label TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_solo_ve_las_suyas" ON api_keys FOR ALL USING (auth.uid() = user_id);

-- Idempotencia: permite que un cliente externo reintente sin duplicar
ALTER TABLE gastos ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX idx_gastos_idempotency ON gastos (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE ingresos ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX idx_ingresos_idempotency ON ingresos (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
