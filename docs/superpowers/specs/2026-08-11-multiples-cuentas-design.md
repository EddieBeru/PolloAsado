# Múltiples cuentas (carteras) — diseño

No está en el [roadmap](../../../ROADMAP.md) original — subsistema nuevo, identificado después. Toca gastos/ingresos existentes, el import bancario y la API externa, pero no requiere cambios en ellos más allá de agregar un campo opcional.

## Propósito

Hoy todos los movimientos (gastos, ingresos) son un pozo único por usuario — no hay forma de separar "cuenta BCR" de "efectivo" de "tarjeta de crédito". El usuario quiere trackear saldo por cuenta bancaria/efectivo.

## Alcance v1

- Cuentas = cuentas bancarias/efectivo/tarjeta, no presupuestos ni espacios (personal vs negocio).
- Solo `gastos` e `ingresos` llevan `cuenta_id`. `deudas`, `ahorros`, `presupuestos` quedan sin cambios.
- Saldo por cuenta es calculado (saldo_inicial + ingresos - gastos de esa cuenta), no un campo que se actualiza con triggers.
- Cuentas no se borran si tienen movimientos — se archivan (`activa = false`). Archivada desaparece de selectores de movimientos nuevos, pero sigue en histórico y en el saldo.
- Import bancario (BCR) y API externa (`agregar_movimiento`) aceptan cuenta destino. API externa: parámetro opcional, default a la cuenta "General" del usuario si se omite (compatibilidad con API keys ya creadas antes de esta feature).
- Dashboard: card "Mis Cuentas" con saldo por cuenta — **solo se renderiza si el usuario tiene más de una cuenta**. Con una sola cuenta ("General"), el dashboard no cambia.

## Arquitectura

### Esquema

```sql
CREATE TABLE cuentas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'banco', -- 'banco' | 'efectivo' | 'tarjeta' | 'otro'
  saldo_inicial DECIMAL(12,2) NOT NULL DEFAULT 0,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gastos ADD COLUMN cuenta_id UUID REFERENCES cuentas(id) NOT NULL;
ALTER TABLE ingresos ADD COLUMN cuenta_id UUID REFERENCES cuentas(id) NOT NULL;
```

RLS en `cuentas`: mismo patrón que las demás tablas (`user_id = auth.uid()`), SECURITY INVOKER.

### Migración de datos existentes

Para cada `user_id` distinto presente en `gastos` o `ingresos`, crear una cuenta `nombre = 'General'`, `tipo = 'banco'`, `saldo_inicial = 0`. Backfill `cuenta_id` en todas las filas existentes de ese usuario apuntando a esa cuenta. Solo entonces se agrega el `NOT NULL` constraint (no se puede poner NOT NULL antes del backfill).

### Cálculo de saldo

Vista o query directa, no columna materializada:

```sql
SELECT c.id, c.nombre, c.saldo_inicial
  + COALESCE((SELECT SUM(monto) FROM ingresos WHERE cuenta_id = c.id), 0)
  - COALESCE((SELECT SUM(monto) FROM gastos WHERE cuenta_id = c.id), 0) AS saldo
FROM cuentas c
WHERE c.user_id = auth.uid() AND c.activa = TRUE;
```

Se calcula en el frontend con dos queries (gastos, ingresos agrupados por cuenta_id) reusando el patrón existente de hooks (`useGastos`/`useIngresos`), no una función RPC nueva — es agregación simple, no lógica de negocio.

### Integración con import bancario (BCR)

`useBankImport.js` gana un paso previo: selector de cuenta destino (default: última usada, guardada en `localStorage` como los demás flags de import). Todas las filas del import se asignan a esa cuenta. No hay detección automática de cuenta desde el HTML de BCR — el usuario la elige a mano cada vez.

### Integración con API externa

`agregar_movimiento` RPC gana parámetro opcional `p_cuenta_id UUID DEFAULT NULL`. Si es NULL, resuelve a la cuenta "General" del usuario dueño de la API key (`SELECT id FROM cuentas WHERE user_id = ... AND nombre = 'General' LIMIT 1`). Si el usuario borró/renombró su "General", falla con excepción clara pidiendo cuenta explícita — no intenta adivinar otra.

### UI

- **Settings → nueva sección "Cuentas"**: mismo patrón visual que `ApiKeysSection` — lista de cuentas con saldo, botón crear, editar nombre/tipo, archivar (no hay botón borrar).
- **Formularios de gasto/ingreso**: selector de cuenta (solo activas), default a la última usada (localStorage, mismo patrón que categorías recientes).
- **Dashboard**: card "Mis Cuentas" — condicional: solo si `cuentas.length > 1`. Muestra nombre + saldo por cuenta.

## Testing

- Hook nuevo `useCuentas` (CRUD + cálculo de saldo) sigue el patrón existente: no unit-testeable por dependencia de Supabase (igual que `useApiKeys`, `useGastos`), se verifica manual end-to-end.
- Migración de backfill se prueba contra la base con datos reales antes de aplicar NOT NULL (rollback plan: si falla el backfill, no se agrega el constraint).
