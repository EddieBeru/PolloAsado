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
