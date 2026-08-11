# API para agregar movimientos desde automatizaciones externas — diseño

No está en el [roadmap](../../../ROADMAP.md) original — subsistema nuevo, identificado después. Independiente de los demás, no depende de ninguno.

## Propósito

Permitir que automatizaciones externas (Apple Shortcuts disparado por notificación de Apple Pay, Tasker, cualquier cliente HTTP) agreguen gastos o ingresos sin abrir la app. No es un import batch como el bancario — es un endpoint que recibe un movimiento a la vez, en tiempo real, desde fuera de la app principal.

## Alcance v1

- Solo alta de movimientos (gasto o ingreso). No editar ni borrar vía API.
- Auth por API key personal (no sesión Supabase) — el cliente externo no puede hacer login normal.
- Implementación 100% en SQL (RPC de Postgres vía PostgREST), sin Edge Function. Se eligió por menos infra que mantener: todo vive en migraciones, sin deploy separado ni runtime extra. El trade-off es lógica de validación más rígida (exceptions de Postgres como respuesta HTTP) — aceptable porque el payload es simple (sin parseo de texto libre como el import bancario).
- Categorización automática reusando `reglas_categorizacion` (mismo mecanismo que import bancario).
- Protección contra duplicados por reintento de red vía idempotency key opcional.

## Arquitectura

### Esquema

```sql
-- API keys por usuario
CREATE TABLE api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  label TEXT NOT NULL,           -- 'iPhone Shortcuts'
  key_hash TEXT NOT NULL UNIQUE, -- sha256 hex del token, nunca se guarda plaintext
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario_solo_ve_las_suyas" ON api_keys FOR ALL USING (auth.uid() = user_id);

-- idempotencia en gastos/ingresos, mismo patrón que documento_banco de import bancario
ALTER TABLE gastos ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX idx_gastos_idempotency ON gastos (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE ingresos ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX idx_ingresos_idempotency ON ingresos (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
```

`origen` (columna existente, TEXT sin CHECK constraint) suma un tercer valor posible: `'api'`, junto a los ya existentes `'manual'` / `'importado'`.

`key_hash` = `encode(digest(token, 'sha256'), 'hex')`, usando `pgcrypto` (ya disponible en el proyecto — es la extensión detrás de `gen_random_uuid()`). El token plaintext existe solo en el momento de generación; se muestra una vez en la UI y después es irrecuperable, igual que un personal access token de GitHub.

### Funciones RPC

**Gestión de keys** — requieren sesión Supabase normal, `SECURITY INVOKER`, filtran por `auth.uid()`:

```sql
crear_api_key(p_label TEXT) RETURNS TABLE(id UUID, token TEXT)
-- genera token random (32 bytes -> base64url), inserta su hash, devuelve el token plaintext (única vez que existe)

revocar_api_key(p_key_id UUID) RETURNS VOID
-- UPDATE api_keys SET revoked_at = NOW() WHERE id = p_key_id AND user_id = auth.uid()
```

Listar keys no necesita RPC propia: `SELECT id, label, last_used_at, revoked_at, created_at FROM api_keys` normal, RLS ya filtra por usuario.

**Insertar movimiento** — `SECURITY DEFINER`, sin sesión Supabase; la API key ES el mecanismo de auth:

```sql
agregar_movimiento(
  p_api_key TEXT,
  p_tipo TEXT,                       -- 'gasto' | 'ingreso'
  p_monto DECIMAL,
  p_descripcion TEXT,
  p_categoria TEXT DEFAULT NULL,
  p_fecha DATE DEFAULT CURRENT_DATE,
  p_lugar TEXT DEFAULT NULL,         -- solo aplica si p_tipo = 'gasto'
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS TABLE(id UUID, categoria_asignada TEXT, duplicado BOOLEAN)
```

Lógica interna, en orden:

1. Hashea `p_api_key`, busca en `api_keys` con `key_hash` igual y `revoked_at IS NULL`. Sin match → `RAISE EXCEPTION 'api key inválida o revocada'`.
2. Si `p_idempotency_key IS NOT NULL` y ya existe una fila con ese `(user_id, idempotency_key)` en la tabla correspondiente → devuelve esa fila (`id`, `categoria`, `duplicado = true`), no inserta de nuevo, corta acá.
3. Valida `p_tipo IN ('gasto', 'ingreso')` y `p_monto > 0` → si no, exception.
4. Si `p_categoria IS NULL`: normaliza `p_descripcion` (mayúsculas, trim) y busca match de `patron` (substring) en `reglas_categorizacion` del usuario para ese `tipo`. Con match, usa esa categoría; sin match, `'Sin categorizar'` (obligatorio para `gastos.categoria`, que es `NOT NULL`; para `ingresos.categoria`, que es nullable, también se usa `'Sin categorizar'` por consistencia en vez de dejarlo NULL).
5. Insert en `gastos` o `ingresos` según `p_tipo`, con `origen = 'api'`, `documento_banco = NULL`.
6. `UPDATE api_keys SET last_used_at = NOW()` en la key usada.
7. Devuelve `(id, categoria_asignada, duplicado = false)`.

Si el paso 5 falla por `unique_violation` en el índice de idempotencia (carrera: dos requests simultáneas con el mismo `idempotency_key`), se captura con `EXCEPTION WHEN unique_violation` dentro del RPC y se resuelve igual que el paso 2 — devuelve la fila ganadora con `duplicado = true`, no propaga el error.

Ejemplo de llamada (Shortcuts, acción "Obtener contenido de URL"):

```
POST https://<project>.supabase.co/rest/v1/rpc/agregar_movimiento
headers: apikey: <anon key>, Content-Type: application/json
body: {
  "p_api_key": "pk_xxx",
  "p_tipo": "gasto",
  "p_monto": 4500,
  "p_descripcion": "Uber",
  "p_idempotency_key": "<uuid generado por el shortcut>"
}
```

## Categorización

Reusa `reglas_categorizacion` tal cual la dejó el import bancario — misma tabla, mismo criterio de substring sobre descripción normalizada. No hay flujo de "recordar regla" desde el API en v1 (eso vive en la UI de import/edición manual); el API solo lee reglas ya existentes.

## UI de gestión de keys

Sección nueva en Config/Perfil ("API keys"):

- Lista de keys del usuario: `label`, fecha de creación, `last_used_at` (o "nunca usada"), badge visual si está revocada.
- Botón "Generar nueva key": pide `label`, llama `crear_api_key`, muestra el token en un modal con botón de copiar y aviso "no se vuelve a mostrar — guardala en un lugar seguro".
- Botón "Revocar" por fila (con confirmación) → llama `revocar_api_key`.

Implementación: hook `useApiKeys` (mismo patrón que `useReglasCategorizacion`: CRUD simple sobre tabla propia con RLS) + componente `ApiKeysSection`.

## Manejo de errores

- **Key inválida o revocada**: exception en el RPC → PostgREST responde 400 con el mensaje. El cliente externo (shortcut) puede mostrar notificación de fallo con ese texto.
- **`p_tipo` inválido o `p_monto <= 0`**: exception, mismo tratamiento que arriba.
- **Idempotency key repetida (caso normal, reintento de red)**: no es error — responde 200 con `duplicado: true` y los datos de la fila ya existente. El shortcut no necesita distinguir "se guardó ahora" de "ya estaba guardado", ambos son éxito desde su perspectiva.
- **Carrera en idempotencia** (dos requests simultáneas, mismo `idempotency_key`): capturada dentro del RPC, mismo resultado que el caso anterior — no se propaga como error 500.

## Fuera de alcance v1

- Editar o borrar movimientos vía API (solo alta).
- Rate limiting / protección contra abuso — proyecto personal, la key es de un solo usuario real.
- Adjuntar filas de `desglose_gastos` / `desglose_ingresos` vía API.
- Multi-divisa en el payload — asume la divisa principal del usuario (`monto_original`/`divisa_original`/`tasa_cambio` quedan NULL).
- Webhooks salientes o confirmación push más allá de la respuesta HTTP síncrona.
- Migrar a Edge Function — se reevalúa si en el futuro se necesita lógica de validación más rica que lo cómodo en PL/pgSQL, o integración con servicios externos (ej. reenviar a otro sistema).
