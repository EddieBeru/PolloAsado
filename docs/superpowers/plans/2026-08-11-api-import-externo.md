# API para agregar movimientos desde automatizaciones externas — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que clientes externos (Apple Shortcuts, Tasker, cualquier HTTP client) agreguen un gasto o ingreso a la cuenta de un usuario vía un RPC de Supabase autenticado con una API key personal, sin usar sesión normal de la app.

**Architecture:** Todo el backend vive en dos migraciones SQL nuevas (tabla `api_keys` + columnas de idempotencia, luego tres funciones RPC: `crear_api_key`, `revocar_api_key`, `agregar_movimiento`). El frontend agrega un hook (`useApiKeys`) y dos componentes chicos (`ApiKeysSection`, `ApiDocsPanel`) montados dentro de la pantalla de Ajustes existente (`Settings.jsx`).

**Tech Stack:** PostgreSQL/PL-pgSQL (Supabase), pgcrypto (hash + generación de token), React 19, `@supabase/supabase-js`, Tailwind (clases utilitarias ya definidas: `card`, `btn-primary`, `btn-secondary`, `btn-danger`, `input`, `notice-warning`, `notice-negative`).

## Global Constraints

- Idioma de UI y mensajes de usuario: español (Costa Rica), mismo tono que el resto de la app (ver `Settings.jsx` como referencia).
- Clases CSS: reusar las utilidades ya existentes (`card`, `btn-primary`, `btn-secondary`, `btn-danger`, `input`, `notice-warning`, `notice-negative`) — no inventar clases nuevas.
- El proyecto no tiene tests automatizados para hooks ni componentes React (solo funciones puras en `src/lib/**/*.test.js` vía Vitest). Los pasos de verificación de hooks/componentes en este plan son manuales en el navegador, no `vitest`.
- Migraciones nuevas van en `supabase/migrations/` con timestamp `YYYYMMDDHHMMSS_` como prefijo, siguiendo el formato de las migraciones existentes.
- Spec de referencia: `docs/superpowers/specs/2026-08-11-api-import-externo-design.md`.

---

## File Structure

- **Create:** `supabase/migrations/20260811040000_add_api_externa_schema.sql` — tabla `api_keys`, RLS, columnas `idempotency_key` + índices únicos en `gastos`/`ingresos`.
- **Create:** `supabase/migrations/20260811040100_add_api_externa_functions.sql` — funciones `crear_api_key`, `revocar_api_key`, `agregar_movimiento`.
- **Create:** `frontend/src/hooks/useApiKeys.js` — hook de acceso a datos (listar, generar, revocar keys).
- **Create:** `frontend/src/components/Settings/ApiKeysSection.jsx` — panel de gestión de keys (lista + generar + revocar), monta `ApiDocsPanel` debajo.
- **Create:** `frontend/src/components/Settings/ApiDocsPanel.jsx` — bloque estático de documentación (endpoint, headers, body/respuesta de ejemplo).
- **Modify:** `frontend/src/components/Settings.jsx` — importar y renderizar `ApiKeysSection` como panel nuevo en la columna izquierda.
- **Modify:** `supabase/squema.sql` — reflejar el esquema final (tabla `api_keys`, columnas nuevas) como referencia consolidada, igual que se hizo para import bancario.

---

## Task 1: Esquema — tabla `api_keys` + columnas de idempotencia

**Files:**
- Create: `supabase/migrations/20260811040000_add_api_externa_schema.sql`
- Modify: `supabase/squema.sql`

**Interfaces:**
- Produces: tabla `api_keys(id, user_id, label, key_hash, last_used_at, revoked_at, created_at)` con RLS; columnas `gastos.idempotency_key` / `ingresos.idempotency_key` (TEXT, nullable) con índice único parcial `(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL`.

- [ ] **Step 1: Escribir la migración de esquema**

```sql
-- supabase/migrations/20260811040000_add_api_externa_schema.sql

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
```

- [ ] **Step 2: Aplicar la migración localmente**

Run: `cd supabase && supabase db reset`
Expected: termina con `Finished supabase db reset` sin errores. (Si Docker no está disponible en tu entorno — problema conocido de este proyecto — omití este paso y verificá la sintaxis leyendo el archivo; la aplicación real ocurre en Task 2 al probar las funciones contra un proyecto Supabase alcanzable.)

- [ ] **Step 3: Verificar el esquema manualmente**

Run (en el SQL editor de Supabase, local o del proyecto):
```sql
\d api_keys
\d gastos
```
Expected: `api_keys` con las 6 columnas listadas arriba; `gastos` incluye la columna `idempotency_key` nueva.

- [ ] **Step 4: Actualizar `squema.sql` con la tabla y columnas nuevas**

Agregar al final de `supabase/squema.sql` (después del comentario de la capa de estadísticas):

```sql

-- API keys pa' automatizaciones externas (Shortcuts, etc.)
CREATE TABLE api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  label TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- gastos.idempotency_key / ingresos.idempotency_key (TEXT, nullable) también se agregan
-- en esta migración, con índice único parcial por (user_id, idempotency_key).
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260811040000_add_api_externa_schema.sql supabase/squema.sql
git commit -m "feat: agregar tabla api_keys y columnas de idempotencia pa' API externa"
```

---

## Task 2: Funciones RPC — `crear_api_key` y `revocar_api_key`

**Files:**
- Create: `supabase/migrations/20260811040100_add_api_externa_functions.sql`

**Interfaces:**
- Consumes: tabla `api_keys` (Task 1).
- Produces: `crear_api_key(p_label TEXT) RETURNS TABLE(id UUID, token TEXT)`, `revocar_api_key(p_key_id UUID) RETURNS VOID`. Ambas `SECURITY INVOKER`, requieren `auth.uid()` (sesión Supabase normal).

- [ ] **Step 1: Escribir las funciones de gestión de keys**

```sql
-- supabase/migrations/20260811040100_add_api_externa_functions.sql

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
```

- [ ] **Step 2: Aplicar y probar `crear_api_key` manualmente**

Run (SQL editor, autenticado como un usuario de prueba — `auth.uid()` tiene que resolver a un usuario real, así que corré esto desde la app o simulando el JWT, no como `postgres` superuser):
```sql
SELECT * FROM crear_api_key('Test manual');
```
Expected: una fila con `id` (uuid) y `token` (string tipo `pk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`). Guardá el `token` para el siguiente paso.

Run:
```sql
SELECT label, key_hash, revoked_at FROM api_keys WHERE label = 'Test manual';
```
Expected: una fila, `key_hash` es un hex de 64 caracteres (sha256), `revoked_at` es `NULL`.

- [ ] **Step 3: Probar `revocar_api_key` manualmente**

Run:
```sql
SELECT revocar_api_key(id) FROM api_keys WHERE label = 'Test manual';
SELECT revoked_at FROM api_keys WHERE label = 'Test manual';
```
Expected: `revoked_at` ya no es `NULL`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260811040100_add_api_externa_functions.sql
git commit -m "feat: agregar RPCs crear_api_key y revocar_api_key"
```

---

## Task 3: Función RPC — `agregar_movimiento`

**Files:**
- Modify: `supabase/migrations/20260811040100_add_api_externa_functions.sql`

**Interfaces:**
- Consumes: `api_keys` (Task 1), `reglas_categorizacion` (tabla existente), `gastos`/`ingresos` (existentes, con `idempotency_key` de Task 1).
- Produces: `agregar_movimiento(p_api_key TEXT, p_tipo TEXT, p_monto DECIMAL, p_descripcion TEXT, p_categoria TEXT DEFAULT NULL, p_fecha DATE DEFAULT CURRENT_DATE, p_lugar TEXT DEFAULT NULL, p_idempotency_key TEXT DEFAULT NULL) RETURNS TABLE(id UUID, categoria_asignada TEXT, duplicado BOOLEAN)`. `SECURITY DEFINER`, sin requerir sesión — autentica por `p_api_key`.

- [ ] **Step 1: Agregar la función al mismo archivo de migración de Task 2**

Append a `supabase/migrations/20260811040100_add_api_externa_functions.sql`:

```sql
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
      UPDATE api_keys SET last_used_at = NOW() WHERE id = v_key_id;
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
    UPDATE api_keys SET last_used_at = NOW() WHERE id = v_key_id;
    RETURN QUERY SELECT v_row_id, v_categoria, TRUE;
    RETURN;
  END;

  UPDATE api_keys SET last_used_at = NOW() WHERE id = v_key_id;
  RETURN QUERY SELECT v_row_id, v_categoria, FALSE;
END;
$$;
```

- [ ] **Step 2: Probar el caso feliz**

Usando el `token` generado en Task 2 Step 2:
```sql
SELECT * FROM agregar_movimiento(
  p_api_key := '<token de Task 2>',
  p_tipo := 'gasto',
  p_monto := 4500,
  p_descripcion := 'Uber',
  p_idempotency_key := 'test-1'
);
```
Expected: una fila, `categoria_asignada = 'Sin categorizar'` (no hay reglas todavía), `duplicado = false`. Confirmá con:
```sql
SELECT monto, descripcion, categoria, origen, idempotency_key FROM gastos WHERE idempotency_key = 'test-1';
```
Expected: `monto = 4500`, `origen = 'api'`.

- [ ] **Step 3: Probar idempotencia (mismo `idempotency_key`)**

Run la misma llamada del Step 2 de nuevo (mismo `p_idempotency_key := 'test-1'`).
Expected: mismo `id` que la primera vez, `duplicado = true`. Confirmá que `gastos` sigue teniendo una sola fila con `idempotency_key = 'test-1'`.

- [ ] **Step 4: Probar key inválida**

```sql
SELECT * FROM agregar_movimiento(p_api_key := 'pk_esto_no_existe', p_tipo := 'gasto', p_monto := 100, p_descripcion := 'x');
```
Expected: error `api key inválida o revocada`.

- [ ] **Step 5: Probar categorización automática**

```sql
INSERT INTO reglas_categorizacion (user_id, patron, categoria, tipo)
SELECT user_id, 'UBER', 'Transporte', 'gasto' FROM api_keys WHERE label = 'Test manual';

SELECT * FROM agregar_movimiento(
  p_api_key := '<token de Task 2>',
  p_tipo := 'gasto',
  p_monto := 3000,
  p_descripcion := 'UBER TRIP 123',
  p_idempotency_key := 'test-2'
);
```
Expected: `categoria_asignada = 'Transporte'`.

- [ ] **Step 6: Limpiar datos de prueba y commitear**

```sql
DELETE FROM gastos WHERE idempotency_key IN ('test-1', 'test-2');
DELETE FROM reglas_categorizacion WHERE patron = 'UBER';
DELETE FROM api_keys WHERE label = 'Test manual';
```

```bash
git add supabase/migrations/20260811040100_add_api_externa_functions.sql
git commit -m "feat: agregar RPC agregar_movimiento con idempotencia y categorización"
```

---

## Task 4: Hook `useApiKeys`

**Files:**
- Create: `frontend/src/hooks/useApiKeys.js`

**Interfaces:**
- Consumes: `supabase` client (`frontend/src/lib/supabaseClient.js`), RPCs `crear_api_key`/`revocar_api_key` (Task 2), tabla `api_keys` (Task 1).
- Produces: `useApiKeys(user)` → `{ keys, loading, error, crearKey(label) -> Promise<string /* token */>, revocarKey(keyId) -> Promise<void> }`. `keys` es `Array<{ id, label, last_used_at, revoked_at, created_at }>`.

- [ ] **Step 1: Implementar el hook**

```javascript
// frontend/src/hooks/useApiKeys.js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useApiKeys(user) {
    const [keys, setKeys] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchKeys = useCallback(async () => {
        if (!user) {
            setKeys([])
            setLoading(false)
            return
        }
        setLoading(true)
        const { data, error: fetchError } = await supabase
            .from('api_keys')
            .select('id, label, last_used_at, revoked_at, created_at')
            .order('created_at', { ascending: false })

        if (fetchError) {
            console.error('No se pudieron traer las API keys:', fetchError)
            setError('No se pudieron cargar tus API keys.')
            setKeys([])
        } else {
            setError(null)
            setKeys(data || [])
        }
        setLoading(false)
    }, [user])

    useEffect(() => { fetchKeys() }, [fetchKeys])

    const crearKey = useCallback(async (label) => {
        const { data, error: rpcError } = await supabase
            .rpc('crear_api_key', { p_label: label })
            .single()

        if (rpcError) {
            console.error('No se pudo crear la API key:', rpcError)
            setError('No se pudo crear la API key.')
            return null
        }
        setError(null)
        await fetchKeys()
        return data.token
    }, [fetchKeys])

    const revocarKey = useCallback(async (keyId) => {
        const { error: rpcError } = await supabase.rpc('revocar_api_key', { p_key_id: keyId })
        if (rpcError) {
            console.error('No se pudo revocar la API key:', rpcError)
            setError('No se pudo revocar la API key.')
            return
        }
        setError(null)
        await fetchKeys()
    }, [fetchKeys])

    return { keys, loading, error, crearKey, revocarKey }
}
```

- [ ] **Step 2: Verificación manual**

Este hook no tiene test automatizado (convención del proyecto: solo funciones puras en `src/lib` tienen `vitest`; hooks se validan en Task 5 junto con la UI que los consume). Confirmá que el archivo no tiene errores de sintaxis:

Run: `cd frontend && npx eslint src/hooks/useApiKeys.js`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useApiKeys.js
git commit -m "feat: agregar hook useApiKeys"
```

---

## Task 5: UI — `ApiDocsPanel` (documentación estática)

**Files:**
- Create: `frontend/src/components/Settings/ApiDocsPanel.jsx`

**Interfaces:**
- Consumes: `import.meta.env.VITE_SUPABASE_URL`, `import.meta.env.VITE_SUPABASE_ANON_KEY` (ya usadas en `frontend/src/lib/supabaseClient.js`).
- Produces: componente `ApiDocsPanel()` (sin props) — bloque de texto/código estático, no llama a Supabase.

- [ ] **Step 1: Implementar el componente**

```jsx
// frontend/src/components/Settings/ApiDocsPanel.jsx
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const ENDPOINT = `${SUPABASE_URL}/rest/v1/rpc/agregar_movimiento`

const BODY_EJEMPLO = JSON.stringify({
    p_api_key: 'pk_tu_key_aquí',
    p_tipo: 'gasto',
    p_monto: 4500,
    p_descripcion: 'Uber',
    p_categoria: null,
    p_fecha: null,
    p_lugar: null,
    p_idempotency_key: 'un-id-unico-que-vos-generes'
}, null, 2)

const RESPUESTA_OK = JSON.stringify([
    { id: 'uuid-del-movimiento', categoria_asignada: 'Transporte', duplicado: false }
], null, 2)

const RESPUESTA_ERROR = JSON.stringify(
    { message: 'api key inválida o revocada' }, null, 2
)

function Bloque({ titulo, children }) {
    return (
        <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-text-secondary">{titulo}</span>
            {children}
        </div>
    )
}

function Codigo({ children }) {
    return (
        <pre className="bg-bg-app border border-border-app/50 rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
            {children}
        </pre>
    )
}

export default function ApiDocsPanel() {
    return (
        <div className="flex flex-col gap-5 pt-4 border-t border-border-app/20">
            <p className="text-sm text-text-secondary leading-relaxed">
                Para agregar un gasto o ingreso desde afuera de la app (Apple Shortcuts, Tasker,
                cualquier cliente HTTP), llamá este endpoint con una de tus API keys.
            </p>

            <Bloque titulo="Endpoint">
                <Codigo>POST {ENDPOINT}</Codigo>
            </Bloque>

            <Bloque titulo="Headers">
                <Codigo>{`apikey: ${ANON_KEY}\nContent-Type: application/json`}</Codigo>
            </Bloque>

            <Bloque titulo="Body (JSON)">
                <Codigo>{BODY_EJEMPLO}</Codigo>
                <p className="text-xs text-text-secondary leading-relaxed">
                    Obligatorios: <code className="user-text">p_api_key</code>, <code className="user-text">p_tipo</code> (
                    <code className="user-text">"gasto"</code> o <code className="user-text">"ingreso"</code>),{' '}
                    <code className="user-text">p_monto</code> (mayor a 0), <code className="user-text">p_descripcion</code>.
                    Opcionales: <code className="user-text">p_categoria</code> (si se omite, se busca automáticamente),{' '}
                    <code className="user-text">p_fecha</code> (default hoy), <code className="user-text">p_lugar</code> (solo gastos),{' '}
                    <code className="user-text">p_idempotency_key</code> (evita duplicados si reintentás la misma llamada).
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                    Nota: <code className="user-text">p_api_key</code> va en el body, no en un header — es tu key personal, distinta
                    del <code className="user-text">apikey</code> del header (que es pública del proyecto).
                </p>
            </Bloque>

            <Bloque titulo="Respuesta exitosa (200)">
                <Codigo>{RESPUESTA_OK}</Codigo>
            </Bloque>

            <Bloque titulo="Respuesta de error (400)">
                <Codigo>{RESPUESTA_ERROR}</Codigo>
            </Bloque>
        </div>
    )
}
```

- [ ] **Step 2: Verificación manual**

Run: `cd frontend && npx eslint src/components/Settings/ApiDocsPanel.jsx`
Expected: sin errores. (La verificación visual completa ocurre en Task 6, cuando el componente se monta dentro de `ApiKeysSection`.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Settings/ApiDocsPanel.jsx
git commit -m "feat: agregar panel estatico de documentacion de la API externa"
```

---

## Task 6: UI — `ApiKeysSection` y wiring en `Settings.jsx`

**Files:**
- Create: `frontend/src/components/Settings/ApiKeysSection.jsx`
- Modify: `frontend/src/components/Settings.jsx`

**Interfaces:**
- Consumes: `useApiKeys(user)` (Task 4), `ApiDocsPanel` (Task 5).
- Produces: componente `ApiKeysSection({ user })`, montado en `Settings.jsx` recibiendo el mismo `user` que ya se le pasa al componente.

- [ ] **Step 1: Implementar `ApiKeysSection`**

```jsx
// frontend/src/components/Settings/ApiKeysSection.jsx
import { useState } from 'react'
import { useApiKeys } from '../../hooks/useApiKeys'
import ApiDocsPanel from './ApiDocsPanel'

export default function ApiKeysSection({ user }) {
    const { keys, loading, error, crearKey, revocarKey } = useApiKeys(user)
    const [label, setLabel] = useState('')
    const [nuevoToken, setNuevoToken] = useState(null)
    const [busy, setBusy] = useState(false)

    const handleGenerar = async (e) => {
        e.preventDefault()
        const nombre = label.trim()
        if (!nombre) return
        setBusy(true)
        const token = await crearKey(nombre)
        setBusy(false)
        if (token) {
            setNuevoToken(token)
            setLabel('')
        }
    }

    const handleRevocar = async (keyId, keyLabel) => {
        const confirmed = window.confirm(`¿Revocar la key "${keyLabel}"? Cualquier automatización que la use deja de funcionar.`)
        if (!confirmed) return
        await revocarKey(keyId)
    }

    return (
        <div className="card flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">API keys</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
                Generá una key para que automatizaciones externas (Apple Shortcuts, etc.) agreguen
                gastos e ingresos sin abrir la app.
            </p>

            {error && <p className="notice-negative" role="alert">{error}</p>}

            {nuevoToken && (
                <div className="notice-warning flex flex-col gap-2" role="status">
                    <span className="font-semibold">Copiá esta key ahora — no se vuelve a mostrar:</span>
                    <code className="user-text font-mono text-xs break-all bg-bg-app p-2 rounded">{nuevoToken}</code>
                    <button type="button" onClick={() => setNuevoToken(null)} className="btn-secondary self-start">Listo, ya la copié</button>
                </div>
            )}

            <form onSubmit={handleGenerar} className="flex gap-2">
                <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Nombre (ej. iPhone Shortcuts)"
                    maxLength={60}
                    className="input flex-1"
                />
                <button type="submit" disabled={busy} className="btn-primary px-4">
                    {busy ? 'Generando…' : 'Generar'}
                </button>
            </form>

            {loading ? (
                <div className="skeleton h-16 w-full" />
            ) : keys.length === 0 ? (
                <p className="text-sm text-text-secondary">Todavía no tenés ninguna API key.</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {keys.map(k => (
                        <div key={k.id} className="flex items-center justify-between gap-3 bg-surface-app/50 rounded-xl border border-border-app/30 p-3">
                            <div className="flex flex-col">
                                <span className="user-text text-sm font-semibold text-text-primary">{k.label}</span>
                                <span className="text-xs text-text-secondary">
                                    {k.revoked_at ? 'Revocada' : (k.last_used_at ? `Usada por última vez ${new Date(k.last_used_at).toLocaleDateString('es-CR')}` : 'Nunca usada')}
                                </span>
                            </div>
                            {!k.revoked_at && (
                                <button
                                    type="button"
                                    onClick={() => handleRevocar(k.id, k.label)}
                                    className="btn-danger px-3 py-1 text-xs"
                                >
                                    Revocar
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <ApiDocsPanel />
        </div>
    )
}
```

- [ ] **Step 2: Montar en `Settings.jsx`**

En `frontend/src/components/Settings.jsx`, agregar el import junto a los demás:

```javascript
import ApiKeysSection from './Settings/ApiKeysSection'
```

Y renderizarlo en la columna izquierda, después del panel de Sincronización (busca el cierre del `<div>` del panel de Sincronización, alrededor de la línea con `Volver a sincronizar` / `Borrar datos de este dispositivo`, justo antes del `</div>` que cierra `flex flex-col gap-8` de la columna izquierda):

```jsx
          {/* PANEL DE API KEYS */}
          <ApiKeysSection user={user} />
        </div>
```

(reemplaza el `</div>` de cierre de columna izquierda actual — el nuevo panel queda dentro de esa columna, después del de Sincronización).

- [ ] **Step 3: Verificación manual en el navegador**

Run: `cd frontend && npm run dev`

En el navegador, logueado con un usuario de prueba:
1. Ir a Ajustes → confirmar que aparece el panel "API keys" en la columna izquierda, debajo de Sincronización.
2. Escribir un label (ej. "Prueba") y hacer clic en "Generar" → esperado: aparece un aviso amarillo con el token, y la lista de keys muestra la nueva fila con "Nunca usada".
3. Hacer clic en "Listo, ya la copié" → el aviso del token desaparece.
4. Refrescar la página → la key sigue en la lista (persistida en `api_keys`).
5. Hacer clic en "Revocar" en esa key, confirmar el diálogo → la fila cambia a "Revocada" y el botón "Revocar" desaparece.
6. Scrollear hasta el bloque de documentación (`ApiDocsPanel`) debajo de la lista → confirmar que el endpoint mostrado usa la URL real del proyecto (`VITE_SUPABASE_URL` del `.env.local`) y que el body de ejemplo es legible.
7. Con la key revocada del paso 5, probar el endpoint real desde una terminal:

```bash
curl -X POST "$VITE_SUPABASE_URL/rest/v1/rpc/agregar_movimiento" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_api_key": "<pega aquí la key que revocaste>", "p_tipo": "gasto", "p_monto": 100, "p_descripcion": "prueba curl"}'
```
Expected: HTTP 400, body con mensaje `api key inválida o revocada`.

8. Generar una key nueva desde la UI, repetir el `curl` con esa key sin revocar.
Expected: HTTP 200, body `[{"id": "...", "categoria_asignada": "Sin categorizar", "duplicado": false}]`. Confirmar en Ajustes/Ingresos-Gastos de la app que el gasto de $100 "prueba curl" aparece.

- [ ] **Step 4: Lint completo**

Run: `cd frontend && npm run lint`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Settings/ApiKeysSection.jsx frontend/src/components/Settings.jsx
git commit -m "feat: agregar UI de gestion de API keys en Ajustes"
```
