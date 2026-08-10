# Presupuesto inteligente: gastos fijos, balde 50/30/20, metas de ahorro y consejos

## Contexto

PRODUCT.md describe PolloAsado como tracker que combina recordar gastos fijos con dejar espacio pa' gastos personales, y dar consejos de manejo de plata. Hoy la pestaña "Presupuestos" es un placeholder vacío y "Ahorros" tampoco existe, aunque el esquema de base de datos (`presupuestos`, `ahorros`, `es_fijo` en `gastos`) ya prevé ambos.

Este documento diseña el primer subsistema del brainstorm más amplio (import bancario, insights avanzados, hub de deseos quedan fuera de alcance, para specs futuros). Cubre:

1. Checklist + alerta de gastos fijos del mes.
2. Balde 50/30/20 configurable (necesidad/gusto/ahorro).
3. CRUD de metas de ahorro.
4. Motor de consejos basado en reglas.
5. Configuración en Ajustes (mapeo categoría→balde, porcentajes).

## Fuera de alcance

- Import de estados de cuenta bancarios (subsistema aparte).
- Insights/estadísticas avanzadas más allá del balde 50/30/20.
- Hub de deseos/proyectos futuros (usa metas de ahorro como base, pero la wishlist en sí es otro spec).
- Historial de movimientos por meta de ahorro (solo se guarda `monto_actual` acumulado; si se necesita historial de abonos, se agrega después).
- Generación automática de instancias de gastos fijos mes a mes — el usuario sigue registrando cada pago manualmente; la app solo recuerda y verifica.

## Modelo de datos

Nueva migración `supabase/migrations/`:

```sql
ALTER TABLE gastos ADD COLUMN dia_esperado INT;
ALTER TABLE gastos ADD COLUMN grupo_recurrencia UUID;
```

- `dia_esperado`: día del mes (1-31) en que se espera el pago. Solo aplica cuando `es_fijo = true`.
- `grupo_recurrencia`: agrupa instancias del mismo gasto fijo a través de los meses (mismo patrón que ya usa `ingresos.grupo_recurrencia`). Al crear un gasto fijo nuevo se genera un UUID nuevo; al registrar el pago del mes siguiente pa' ese mismo fijo, el usuario selecciona el fijo existente y la instancia nueva hereda su `grupo_recurrencia`.

`perfiles.preferencias` (JSONB existente, hoy sin uso desde el frontend) gana dos claves:

```json
{
  "categoria_baldes": {
    "Vivienda": "necesidad",
    "Servicios": "necesidad",
    "Salud": "necesidad",
    "Transporte": "necesidad",
    "Alimentación": "necesidad",
    "Entretenimiento": "gusto",
    "Ropa": "gusto",
    "Educación": "gusto",
    "Otros": "gusto"
  },
  "porcentajes_balde": { "necesidad": 50, "gusto": 30, "ahorro": 20 }
}
```

Default se precarga si `preferencias` no trae estas claves (usuarios existentes). `ahorros` no cambia de esquema.

## Checklist + alerta de gastos fijos

Vive en la pantalla Presupuestos.

- **Fuente de fijos activos**: distinct `grupo_recurrencia` de `gastos` donde `es_fijo = true`, tomando la instancia más reciente de cada grupo como plantilla (nombre, categoría, monto de referencia, `dia_esperado`).
- **Estado por fijo este mes**: ✓ si existe un `gasto` con ese `grupo_recurrencia` y `fecha` dentro del mes actual; pendiente si no.
- **Banner de alerta**: si `hoy.dia > dia_esperado` de algún fijo pendiente este mes, banner visible arriba de la lista ("Se pasó la fecha esperada de X"). No bloquea nada, solo informa — coherente con "Honest over reassuring".
- Fijo nuevo se crea desde el mismo `OutcomeForm` marcando `es_fijo` (ya existe el checkbox); se agrega campo `dia_esperado` condicional cuando `es_fijo = true`.

## Balde 50/30/20

- Hook nuevo `useBudgetSplit(mes, anio)`:
  1. Llama `get_totals_by_category('gasto', inicio_mes, fin_mes)` (RPC existente, sin cambios).
  2. Reagrupa el resultado en cliente usando `preferencias.categoria_baldes`.
  3. Techo por balde = ingreso total del mes (de `useMonthTotals`, ya existe) × `porcentajes_balde[balde] / 100`.
  4. Devuelve `{ necesidad: {gastado, techo}, gusto: {...}, ahorro: {...} }`.
- UI: reusa `SplitBar` (ya existe para ingreso/gasto) generalizado a 3 segmentos, o una variante nueva `BaldeBar` si `SplitBar` está muy amarrado a 2 segmentos — decisión de implementación, no bloquea el diseño.
- Categoría sin mapeo en `categoria_baldes` (no debería pasar con el default, pero por si acaso) cae en "gusto" y se loguea en consola en dev — no rompe el render.

## Metas de ahorro (Ahorros)

- `useSavings()`: mismo patrón CRUD que `useIncomes`/`useOutcomes` — cache local vía `localforage`, sync contra tabla `ahorros`, usa el `persist()` helper ya existente pa' manejo de errores.
- `AhorroForm`: nombre, monto_meta, monto_actual inicial, toggle `es_automatico` (+ frecuencia/monto si se activa) — campos ya soportados por el schema.
- `AhorroList`: tarjeta por meta con barra de progreso `monto_actual/monto_meta` (reusa estética de `CurrentBalance`).
- "Abonar a esta meta": incrementa `monto_actual` directo (update), sin tabla de movimientos separada — YAGNI hasta que se pida historial.
- Reemplaza el placeholder genérico de Layout.jsx para el tab `savings`.

## Motor de consejos

Función pura, sin llamadas externas ni IA, en `frontend/src/lib/consejos.js`:

```
generarConsejos({ baldes, metasAhorro }) -> string[] (máx 2 mensajes)
```

Reglas, en orden de prioridad:

1. Si algún balde superó su techo → "Este mes ya pasaste el límite de gustos/necesidades por ₡X" (tono directo, sin regaño ni gamificación).
2. Si `gusto.gastado < gusto.techo` y hay al menos una meta de ahorro con `monto_actual < monto_meta` → "Te quedan ₡X libres en gustos. A este ritmo le faltan Y meses a tu meta '{nombre}' — capaz mandás parte pa' allá."
3. Si `gusto.gastado < gusto.techo` sin metas activas → "Te quedan ₡X libres este mes" (neutral, sin sugerir compra específica — evitar inventar productos que no existen en los datos del usuario).
4. Si todo cuadra sin sobrantes ni excesos → sin mensaje (no rellenar con ruido).

Se muestra en una card en Presupuestos, debajo del balde 50/30/20.

## Ajustes

Nueva sección en `Settings.jsx`, respaldada por hook nuevo `useProfilePreferences()`:

- Lee/escribe `perfiles.preferencias` en Supabase (tabla existente, RLS ya cubre `auth.uid() = id`).
- Si offline, cae a copia cacheada en `localforage` (mismo patrón que `useSettings`) y sincroniza al volver — reporta error de sync en vez de tragarlo, igual que el resto del código.
- UI: selector necesidad/gusto/ahorro por cada una de las 9 categorías fijas de gasto; 3 inputs numéricos de porcentaje con validación de suma = 100 antes de guardar.

## Manejo de errores y estados vacíos

- Checklist de fijos sin ningún fijo configurado → estado vacío explicativo ("Todavía no tenés gastos fijos marcados"), no oculta la sección.
- Balde 50/30/20 sin ingreso registrado este mes → techo en 0, se muestra igual con nota ("Registrá un ingreso este mes pa' ver el reparto").
- Consejos sin datos suficientes → no se muestra la card (evita mensaje vacío o genérico sin sentido).
- Todo sync sigue el patrón ya establecido: `persist()` helper, estados de error visibles en UI, sin fallback silencioso.

## Archivos nuevos/tocados (referencia, no exhaustivo)

- `supabase/migrations/<timestamp>_add_gastos_fijos_fields.sql`
- `frontend/src/hooks/useBudgetSplit.js`
- `frontend/src/hooks/useSavings.js`
- `frontend/src/hooks/useProfilePreferences.js`
- `frontend/src/lib/consejos.js`
- `frontend/src/components/Budget/` (checklist fijos, balde, consejos) — reemplaza placeholder en `Layout.jsx` pa' tab `budgets`
- `frontend/src/components/Savings/` (`AhorroForm`, `AhorroList`) — reemplaza placeholder en `Layout.jsx` pa' tab `savings`
- `frontend/src/components/Outcome/OutcomeForm.jsx` — agrega campo `dia_esperado` condicional
- `frontend/src/components/Settings.jsx` — nueva sección de mapeo de baldes y porcentajes
