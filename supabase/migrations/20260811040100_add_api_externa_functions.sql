CREATE OR REPLACE FUNCTION crear_api_key(p_label TEXT)
RETURNS TABLE(id UUID, token TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_token TEXT;
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'se requiere sesión activa';
  END IF;

  v_token := 'pk_' || encode(gen_random_bytes(24), 'base64');
  v_token := replace(replace(replace(v_token, '/', '_'), '+', '-'), '=', '');

  INSERT INTO api_keys (user_id, label, key_hash)
  VALUES (auth.uid(), p_label, encode(digest(v_token, 'sha256'), 'hex'))
  RETURNING api_keys.id INTO v_id;

  RETURN QUERY SELECT v_id, v_token;
END;
$$;

CREATE OR REPLACE FUNCTION revocar_api_key(p_key_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE api_keys SET revoked_at = NOW()
  WHERE id = p_key_id AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION agregar_movimiento(
  p_api_key TEXT,
  p_tipo TEXT,
  p_monto DECIMAL,
  p_descripcion TEXT,
  p_categoria TEXT DEFAULT NULL,
  p_fecha DATE DEFAULT CURRENT_DATE,
  p_lugar TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS TABLE(id UUID, categoria_asignada TEXT, duplicado BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_key_id UUID;
  v_descripcion_normalizada TEXT;
  v_categoria TEXT;
  v_row_id UUID;
BEGIN
  -- 1. Autenticar por api key
  SELECT ak.user_id, ak.id INTO v_user_id, v_key_id
  FROM api_keys ak
  WHERE ak.key_hash = encode(digest(p_api_key, 'sha256'), 'hex')
    AND ak.revoked_at IS NULL;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'api key inválida o revocada';
  END IF;

  IF p_tipo NOT IN ('gasto', 'ingreso') THEN
    RAISE EXCEPTION 'p_tipo inválido: %, esperado gasto o ingreso', p_tipo;
  END IF;

  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'p_monto debe ser mayor a 0';
  END IF;

  -- 2. Idempotencia: si ya existe, devolverla sin insertar de nuevo
  IF p_idempotency_key IS NOT NULL THEN
    IF p_tipo = 'gasto' THEN
      SELECT g.id, g.categoria INTO v_row_id, v_categoria
      FROM gastos g
      WHERE g.user_id = v_user_id AND g.idempotency_key = p_idempotency_key;
    ELSE
      SELECT i.id, i.categoria INTO v_row_id, v_categoria
      FROM ingresos i
      WHERE i.user_id = v_user_id AND i.idempotency_key = p_idempotency_key;
    END IF;

    IF v_row_id IS NOT NULL THEN
      UPDATE api_keys SET last_used_at = NOW() WHERE api_keys.id = v_key_id;
      RETURN QUERY SELECT v_row_id, v_categoria, TRUE;
      RETURN;
    END IF;
  END IF;

  -- 3. Categorización automática si no vino categoría explícita
  v_categoria := p_categoria;
  IF v_categoria IS NULL THEN
    v_descripcion_normalizada := UPPER(TRIM(p_descripcion));
    SELECT r.categoria INTO v_categoria
    FROM reglas_categorizacion r
    WHERE r.user_id = v_user_id
      AND r.tipo = p_tipo
      AND v_descripcion_normalizada LIKE '%' || r.patron || '%'
    LIMIT 1;

    IF v_categoria IS NULL THEN
      v_categoria := 'Sin categorizar';
    END IF;
  END IF;

  -- 4. Insert, con manejo de carrera en idempotency_key
  BEGIN
    IF p_tipo = 'gasto' THEN
      INSERT INTO gastos (user_id, monto, descripcion, categoria, lugar, fecha, origen, idempotency_key)
      VALUES (v_user_id, p_monto, p_descripcion, v_categoria, p_lugar, p_fecha, 'api', p_idempotency_key)
      RETURNING gastos.id INTO v_row_id;
    ELSE
      INSERT INTO ingresos (user_id, monto, descripcion, categoria, fecha, origen, idempotency_key)
      VALUES (v_user_id, p_monto, p_descripcion, v_categoria, p_fecha, 'api', p_idempotency_key)
      RETURNING ingresos.id INTO v_row_id;
    END IF;
  EXCEPTION WHEN unique_violation THEN
    IF p_tipo = 'gasto' THEN
      SELECT g.id, g.categoria INTO v_row_id, v_categoria
      FROM gastos g WHERE g.user_id = v_user_id AND g.idempotency_key = p_idempotency_key;
    ELSE
      SELECT i.id, i.categoria INTO v_row_id, v_categoria
      FROM ingresos i WHERE i.user_id = v_user_id AND i.idempotency_key = p_idempotency_key;
    END IF;
    UPDATE api_keys SET last_used_at = NOW() WHERE api_keys.id = v_key_id;
    RETURN QUERY SELECT v_row_id, v_categoria, TRUE;
    RETURN;
  END;

  UPDATE api_keys SET last_used_at = NOW() WHERE api_keys.id = v_key_id;
  RETURN QUERY SELECT v_row_id, v_categoria, FALSE;
END;
$$;
