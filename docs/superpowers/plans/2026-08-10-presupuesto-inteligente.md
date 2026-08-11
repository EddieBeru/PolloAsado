# Presupuesto Inteligente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build checklist de gastos fijos con alerta, balde 50/30/20 configurable, CRUD de metas de ahorro, y motor de consejos basado en reglas, per `docs/superpowers/specs/2026-08-10-gastos-fijos-presupuesto-inteligente-design.md`.

**Architecture:** Mismo patrón offline-first del resto de la app: hooks con `localforage` cache + PUSH/PULL contra Supabase, cálculos puros en `lib/` (testeables sin red), componentes presentacionales alimentados por hooks a nivel de página (mismo patrón que `Dashboard.jsx` + `Dashboard/CurrentBalance.jsx`).

**Tech Stack:** React 19, Supabase JS 2, localforage, Tailwind v4 (clases utilitarias custom: `card`, `input`, `btn-primary`, `notice-warning`, etc — ver `frontend/src/index.css`), Vitest (nuevo, se instala en Task 1).

## Global Constraints

- No hay librería de componentes (MUI/etc): todo es HTML plano + Tailwind. Seguir clases ya definidas en `frontend/src/index.css` (`card`, `well`, `input`, `btn-primary`, `btn-secondary`, `btn-danger`, `notice-warning`, `notice-negative`, `tag-warning`, `skeleton`, `heading`, `num`, `user-text`).
- Todo hook de datos sigue el patrón de `useOutcomes.js`: cache local instantánea (`loadLocalData`), luego `syncWithSupabase` (PUSH pendientes + PULL), optimistic update en cada mutación, `persist()` llamado consistentemente (no bypasses directos al store, a diferencia del bug pre-existente en `useIncomes.js`).
- Nombres de columnas DB en español (`monto`, `descripcion`, `fecha`, `categoria`); UI usa alias en inglés (`amount`, `concept`, `date`, `category`) solo donde ya existía ese mapeo (`gastos`/`ingresos`). Tablas nuevas para este plan (`ahorros`) no necesitan ese remapeo — usar nombres DB directo en la UI.
- Cambios de esquema SOLO vía `supabase/migrations/`, nunca directo en la DB. Reflejar el resultado final en `supabase/squema.sql` y `supabase/rls.sql` (referencia completa), siguiendo la convención ya usada (ver `docs/superpowers/plans/2026-08-11-import-bancario.md` Task de migración).
- `formatMoney(value, currency, opts)` de `frontend/src/lib/format.js` para toda cifra monetaria en UI. `toNumber(value, fallback)` para toda coerción numérica de inputs.
- Moneda base: `settings.divisa_principal` vía `useSettings()` (local-only, no confundir con `useProfilePreferences` nuevo — son dos preferencias distintas: divisa es de `useSettings`, baldes/porcentajes son de `useProfilePreferences`).

---

## Hallazgo crítico: `perfiles` no tiene policy de RLS

`supabase/rls.sql` activa RLS en `perfiles` pero nunca define una `CREATE POLICY` para esa tabla (a diferencia de las otras 8 tablas). RLS activo + cero policies = ninguna fila es legible ni escribible desde el cliente. Sin arreglar esto, `useProfilePreferences` (Task 8) no puede leer ni guardar nada. La migración de Task 2 agrega la policy faltante.

También: ninguna fila de `perfiles` se crea hoy en signup (no hay trigger `handle_new_user` ni insert manual) — `useProfilePreferences` debe usar `upsert`, no `update`, o el primer guardado de cada usuario fallará silenciosamente.

---

### Task 1: Instalar Vitest (no existe tooling de tests en el repo)

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.js`
- Create: `frontend/src/lib/sanity.test.js`

**Interfaces:**
- Produces: comando `npm run test` (o `pnpm test`) corriendo Vitest en modo `run`.

- [ ] **Step 1: Instalar dependencias**

```bash
cd frontend && pnpm add -D vitest jsdom
```

(Usar `pnpm`, no `npm` — `npm install` falla en este repo por conflicto `vite-plugin-pwa`/`vite@8`, confirmado en trabajo previo del branch `import-bancario`.)

- [ ] **Step 2: Crear config de Vitest**

`frontend/vitest.config.js`:
```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true
  }
})
```

- [ ] **Step 3: Agregar script de test**

En `frontend/package.json`, dentro de `"scripts"`:
```json
"test": "vitest run"
```

- [ ] **Step 4: Test de humo pa' confirmar que el wiring funciona**

`frontend/src/lib/sanity.test.js`:
```js
import { describe, it, expect } from 'vitest'

describe('vitest wiring', () => {
  it('corre', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Correr y confirmar**

Run: `cd frontend && npm run test`
Expected: PASS (1 test)

- [ ] **Step 6: Borrar el test de humo y commitear el tooling**

```bash
rm frontend/src/lib/sanity.test.js
cd frontend && git add package.json pnpm-lock.yaml vitest.config.js
git commit -m "chore: agregar vitest para tests de lógica pura"
```

---

### Task 2: Migración de esquema — campos de fijos, policy de perfiles, defaults de baldes

**Files:**
- Create: `supabase/migrations/20260811030000_add_presupuesto_inteligente.sql`
- Modify: `supabase/squema.sql`
- Modify: `supabase/rls.sql`

**Interfaces:**
- Produces: columnas `gastos.dia_esperado INT`, `gastos.grupo_recurrencia UUID`; policy RLS en `perfiles`; default JSONB de `perfiles.preferencias` con `categoria_baldes` y `porcentajes_balde`.

- [ ] **Step 1: Escribir la migración**

`supabase/migrations/20260811030000_add_presupuesto_inteligente.sql`:
```sql
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
```

- [ ] **Step 2: Reflejar en `squema.sql`**

En `supabase/squema.sql`, tabla `gastos` (línea 28-40), agregar tras `es_fijo BOOLEAN DEFAULT FALSE`:
```sql
  dia_esperado INT,
  grupo_recurrencia UUID,
```

Tabla `perfiles` (línea 1-7), reemplazar el default de `preferencias` por el mismo JSONB completo del Step 1.

- [ ] **Step 3: Reflejar en `rls.sql`**

En `supabase/rls.sql`, después de la línea `ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;`, agregar:
```sql
CREATE POLICY "usuario_solo_ve_el_suyo" ON perfiles FOR ALL USING (auth.uid() = id);
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260811030000_add_presupuesto_inteligente.sql supabase/squema.sql supabase/rls.sql
git commit -m "feat(db): agregar campos de fijos, policy de perfiles y defaults de baldes"
```

---

### Task 3: Constante compartida de categorías de gasto

**Files:**
- Create: `frontend/src/lib/categorias.js`

**Interfaces:**
- Produces: `CATEGORIAS_GASTO: string[]` — usado por Task 11 (OutcomeForm) y Task 15 (Settings).

- [ ] **Step 1: Crear el archivo**

`frontend/src/lib/categorias.js`:
```js
// Categorías fijas de gasto. Único lugar que las declara: OutcomeForm y el
// mapeo de baldes en Ajustes tienen que ver siempre la misma lista.
export const CATEGORIAS_GASTO = [
  'Alimentación',
  'Vivienda',
  'Transporte',
  'Salud',
  'Entretenimiento',
  'Educación',
  'Ropa',
  'Servicios',
  'Otros'
]
```

- [ ] **Step 2: Commit**

```bash
cd frontend && git add src/lib/categorias.js
git commit -m "refactor: extraer categorías de gasto a constante compartida"
```

---

### Task 4: `monthRange` en `lib/period.js`

**Files:**
- Modify: `frontend/src/lib/period.js`
- Create: `frontend/src/lib/period.test.js`

**Interfaces:**
- Produces: `monthRange(anio, mes) -> { start, end, ym }` — usado por Task 9 (`useBudgetSplit`).

- [ ] **Step 1: Test primero**

`frontend/src/lib/period.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { monthRange } from './period'

describe('monthRange', () => {
  it('devuelve el rango completo de un mes de 31 días', () => {
    expect(monthRange(2026, 1)).toEqual({ start: '2026-01-01', end: '2026-01-31', ym: '2026-01' })
  })

  it('devuelve el rango completo de febrero en año bisiesto', () => {
    expect(monthRange(2028, 2)).toEqual({ start: '2028-02-01', end: '2028-02-29', ym: '2028-02' })
  })

  it('devuelve el rango completo de febrero en año no bisiesto', () => {
    expect(monthRange(2026, 2)).toEqual({ start: '2026-02-01', end: '2026-02-28', ym: '2026-02' })
  })
})
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `cd frontend && npm run test -- period`
Expected: FAIL — `monthRange is not a function`

- [ ] **Step 3: Implementar**

Agregar al final de `frontend/src/lib/period.js`:
```js
/** Rango completo de un mes calendario. anio: 4 dígitos, mes: 1-12. */
export function monthRange(anio, mes) {
  const ym = `${anio}-${pad(mes)}`
  const start = `${ym}-01`
  const lastDay = new Date(anio, mes, 0).getDate()
  const end = `${ym}-${pad(lastDay)}`
  return { start, end, ym }
}
```

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `cd frontend && npm run test -- period`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/lib/period.js src/lib/period.test.js
git commit -m "feat: agregar monthRange para rangos de mes calendario"
```

---

### Task 5: `lib/fixedExpenses.js` — checklist de fijos (lógica pura)

**Files:**
- Create: `frontend/src/lib/fixedExpenses.js`
- Create: `frontend/src/lib/fixedExpenses.test.js`

**Interfaces:**
- Consumes: outcomes con shape `{ es_fijo, grupo_recurrencia, dia_esperado, concept, category, amount, date }` (shape UI ya producido por `useOutcomes`).
- Produces: `getFixedExpenseTemplates(outcomes) -> Array<{grupo_recurrencia, concept, category, amount, dia_esperado}>` y `computeFixedExpensesStatus(outcomes, {anio, mes, hoy}) -> { fijos: Array<{...template, pagado, atrasado}>, hayAtrasados }`. Usado por Task 11 (OutcomeForm, selector de fijo existente) y Task 12 (checklist).

- [ ] **Step 1: Tests primero**

`frontend/src/lib/fixedExpenses.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { getFixedExpenseTemplates, computeFixedExpensesStatus } from './fixedExpenses'

const luz = { es_fijo: true, grupo_recurrencia: 'g-luz', concept: 'Luz', category: 'Servicios', amount: 30000, dia_esperado: 10, date: '2026-07-10' }
const luzAgosto = { ...luz, date: '2026-08-08', amount: 32000 }
const alquiler = { es_fijo: true, grupo_recurrencia: 'g-alq', concept: 'Alquiler', category: 'Vivienda', amount: 250000, dia_esperado: 5, date: '2026-07-05' }
const variable = { es_fijo: false, grupo_recurrencia: null, concept: 'Súper', category: 'Alimentación', amount: 15000, date: '2026-08-01' }

describe('getFixedExpenseTemplates', () => {
  it('toma la instancia más reciente de cada grupo', () => {
    const templates = getFixedExpenseTemplates([luz, luzAgosto, alquiler, variable])
    expect(templates).toHaveLength(2)
    const luzTemplate = templates.find(t => t.grupo_recurrencia === 'g-luz')
    expect(luzTemplate.amount).toBe(32000)
  })

  it('ignora gastos que no son fijos', () => {
    expect(getFixedExpenseTemplates([variable])).toEqual([])
  })
})

describe('computeFixedExpensesStatus', () => {
  it('marca pagado si hay una instancia del grupo con fecha en el mes', () => {
    const { fijos } = computeFixedExpensesStatus([luz, luzAgosto], { anio: 2026, mes: 8, hoy: '2026-08-11' })
    expect(fijos.find(f => f.grupo_recurrencia === 'g-luz').pagado).toBe(true)
  })

  it('marca pendiente y atrasado si hoy pasó el día esperado sin pago este mes', () => {
    const { fijos, hayAtrasados } = computeFixedExpensesStatus([alquiler], { anio: 2026, mes: 8, hoy: '2026-08-11' })
    const alq = fijos.find(f => f.grupo_recurrencia === 'g-alq')
    expect(alq.pagado).toBe(false)
    expect(alq.atrasado).toBe(true)
    expect(hayAtrasados).toBe(true)
  })

  it('no marca atrasado si todavía no llega el día esperado', () => {
    const { fijos, hayAtrasados } = computeFixedExpensesStatus([alquiler], { anio: 2026, mes: 8, hoy: '2026-08-02' })
    expect(fijos[0].atrasado).toBe(false)
    expect(hayAtrasados).toBe(false)
  })

  it('sin fijos configurados devuelve lista vacía', () => {
    const { fijos, hayAtrasados } = computeFixedExpensesStatus([variable], { anio: 2026, mes: 8, hoy: '2026-08-11' })
    expect(fijos).toEqual([])
    expect(hayAtrasados).toBe(false)
  })
})
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `cd frontend && npm run test -- fixedExpenses`
Expected: FAIL — módulo no existe

- [ ] **Step 3: Implementar**

`frontend/src/lib/fixedExpenses.js`:
```js
// Checklist de gastos fijos: agrupa outcomes por grupo_recurrencia y calcula
// estado (pagado/pendiente/atrasado) para el mes indicado.

/**
 * Instancia más reciente de cada grupo_recurrencia activo (plantilla del fijo).
 * @param {Array} outcomes
 * @returns {Array<{grupo_recurrencia, concept, category, amount, dia_esperado}>}
 */
export function getFixedExpenseTemplates(outcomes = []) {
  const fijos = outcomes.filter(o => o.es_fijo && o.grupo_recurrencia)
  const byGroup = new Map()
  for (const o of fijos) {
    const existing = byGroup.get(o.grupo_recurrencia)
    if (!existing || o.date > existing.date) byGroup.set(o.grupo_recurrencia, o)
  }
  return Array.from(byGroup.values()).map(o => ({
    grupo_recurrencia: o.grupo_recurrencia,
    concept: o.concept,
    category: o.category,
    amount: o.amount,
    dia_esperado: o.dia_esperado
  }))
}

/**
 * Estado de cada fijo para el mes/año dados.
 * @param {Array} outcomes
 * @param {{anio: number, mes: number, hoy: string}} params  hoy en 'YYYY-MM-DD'
 * @returns {{ fijos: Array, hayAtrasados: boolean }}
 */
export function computeFixedExpensesStatus(outcomes = [], { anio, mes, hoy }) {
  const templates = getFixedExpenseTemplates(outcomes)
  const ym = `${anio}-${String(mes).padStart(2, '0')}`
  const diaHoy = Number(hoy.slice(8, 10))
  const hoyEsDelMes = hoy.slice(0, 7) === ym

  const fijos = templates.map(t => {
    const pagado = outcomes.some(o =>
      o.grupo_recurrencia === t.grupo_recurrencia &&
      o.date && o.date.slice(0, 7) === ym
    )
    const atrasado = !pagado && hoyEsDelMes && t.dia_esperado != null && diaHoy > t.dia_esperado
    return { ...t, pagado, atrasado }
  })

  return { fijos, hayAtrasados: fijos.some(f => f.atrasado) }
}
```

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `cd frontend && npm run test -- fixedExpenses`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/lib/fixedExpenses.js src/lib/fixedExpenses.test.js
git commit -m "feat: agregar cálculo puro de checklist de gastos fijos"
```

---

### Task 6: `lib/budgetSplit.js` — balde 50/30/20 (lógica pura)

**Files:**
- Create: `frontend/src/lib/budgetSplit.js`
- Create: `frontend/src/lib/budgetSplit.test.js`

**Interfaces:**
- Produces: `computeBudgetSplit({totalsByCategory, categoriaBaldes, porcentajesBalde, ingresoMensual}) -> {necesidad:{gastado,techo}, gusto:{...}, ahorro:{...}}`. Usado por Task 9 (`useBudgetSplit`).

- [ ] **Step 1: Tests primero**

`frontend/src/lib/budgetSplit.test.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { computeBudgetSplit } from './budgetSplit'

const categoriaBaldes = { Vivienda: 'necesidad', Entretenimiento: 'gusto' }
const porcentajesBalde = { necesidad: 50, gusto: 30, ahorro: 20 }

describe('computeBudgetSplit', () => {
  it('reparte gastado por balde según el mapeo de categorías', () => {
    const totalsByCategory = [
      { categoria: 'Vivienda', total: 100000 },
      { categoria: 'Entretenimiento', total: 20000 }
    ]
    const result = computeBudgetSplit({ totalsByCategory, categoriaBaldes, porcentajesBalde, ingresoMensual: 500000 })
    expect(result.necesidad.gastado).toBe(100000)
    expect(result.gusto.gastado).toBe(20000)
    expect(result.ahorro.gastado).toBe(0)
  })

  it('calcula el techo como ingreso × porcentaje del balde', () => {
    const result = computeBudgetSplit({ totalsByCategory: [], categoriaBaldes, porcentajesBalde, ingresoMensual: 500000 })
    expect(result.necesidad.techo).toBe(250000)
    expect(result.gusto.techo).toBe(150000)
    expect(result.ahorro.techo).toBe(100000)
  })

  it('categoría sin mapeo cae en gusto', () => {
    const totalsByCategory = [{ categoria: 'SinMapear', total: 5000 }]
    const result = computeBudgetSplit({ totalsByCategory, categoriaBaldes, porcentajesBalde, ingresoMensual: 100000 })
    expect(result.gusto.gastado).toBe(5000)
  })

  it('sin ingreso, techo en 0 pero no rompe', () => {
    const result = computeBudgetSplit({ totalsByCategory: [], categoriaBaldes, porcentajesBalde, ingresoMensual: 0 })
    expect(result.necesidad.techo).toBe(0)
    expect(result.gusto.techo).toBe(0)
    expect(result.ahorro.techo).toBe(0)
  })
})
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `cd frontend && npm run test -- budgetSplit`
Expected: FAIL — módulo no existe

- [ ] **Step 3: Implementar**

`frontend/src/lib/budgetSplit.js`:
```js
const BALDES = ['necesidad', 'gusto', 'ahorro']

/**
 * Reparto 50/30/20 a partir de totales por categoría del mes.
 * @param {Object} params
 * @param {Array<{categoria, total}>} params.totalsByCategory
 * @param {Object<string,string>} params.categoriaBaldes
 * @param {Object<string,number>} params.porcentajesBalde
 * @param {number} params.ingresoMensual
 * @returns {{necesidad:{gastado,techo}, gusto:{...}, ahorro:{...}}}
 */
export function computeBudgetSplit({ totalsByCategory = [], categoriaBaldes = {}, porcentajesBalde = {}, ingresoMensual = 0 }) {
  const gastado = { necesidad: 0, gusto: 0, ahorro: 0 }

  for (const row of totalsByCategory) {
    let balde = categoriaBaldes[row.categoria]
    if (!balde || !BALDES.includes(balde)) {
      if (import.meta.env.DEV) {
        console.warn(`Categoría "${row.categoria}" sin balde asignado, se cuenta como "gusto".`)
      }
      balde = 'gusto'
    }
    gastado[balde] += row.total
  }

  const result = {}
  for (const balde of BALDES) {
    const pct = porcentajesBalde[balde] || 0
    result[balde] = {
      gastado: gastado[balde],
      techo: ingresoMensual * (pct / 100)
    }
  }
  return result
}
```

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `cd frontend && npm run test -- budgetSplit`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/lib/budgetSplit.js src/lib/budgetSplit.test.js
git commit -m "feat: agregar cálculo puro del balde 50/30/20"
```

---

### Task 7: `lib/consejos.js` — motor de consejos (lógica pura)

**Files:**
- Create: `frontend/src/lib/consejos.js`
- Create: `frontend/src/lib/consejos.test.js`

**Interfaces:**
- Consumes: `baldes` shape de Task 6 (`computeBudgetSplit`); `metasAhorro: Array<{nombre, monto_meta, monto_actual}>` (shape DB de `ahorros`, ver Task 10).
- Produces: `generarConsejos({baldes, metasAhorro}) -> string[]` (máx 2). Usado por Task 13 (`ConsejosCard`).

- [ ] **Step 1: Tests primero**

`frontend/src/lib/consejos.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { generarConsejos } from './consejos'

const baldeOk = { gastado: 100, techo: 200 }
const baldeExcedido = { gastado: 250, techo: 200 }

describe('generarConsejos', () => {
  it('prioridad 1: avisa si algún balde superó su techo', () => {
    const baldes = { necesidad: baldeExcedido, gusto: baldeOk, ahorro: baldeOk }
    const mensajes = generarConsejos({ baldes, metasAhorro: [] })
    expect(mensajes).toHaveLength(1)
    expect(mensajes[0]).toContain('límite')
  })

  it('prioridad 2: con espacio en gusto y meta activa, sugiere mandar plata a la meta', () => {
    const baldes = { necesidad: baldeOk, gusto: { gastado: 100, techo: 200 }, ahorro: baldeOk }
    const metasAhorro = [{ nombre: 'Viaje', monto_meta: 1000, monto_actual: 500 }]
    const mensajes = generarConsejos({ baldes, metasAhorro })
    expect(mensajes[0]).toContain('Viaje')
    expect(mensajes[0]).toMatch(/\d+ mes/)
  })

  it('prioridad 3: con espacio en gusto sin metas activas, mensaje neutral', () => {
    const baldes = { necesidad: baldeOk, gusto: { gastado: 100, techo: 200 }, ahorro: baldeOk }
    const mensajes = generarConsejos({ baldes, metasAhorro: [] })
    expect(mensajes[0]).toMatch(/libres/)
    expect(mensajes[0]).not.toContain('meta')
  })

  it('prioridad 3: ignora metas ya completas', () => {
    const baldes = { necesidad: baldeOk, gusto: { gastado: 100, techo: 200 }, ahorro: baldeOk }
    const metasAhorro = [{ nombre: 'Completa', monto_meta: 100, monto_actual: 100 }]
    const mensajes = generarConsejos({ baldes, metasAhorro })
    expect(mensajes[0]).not.toContain('Completa')
  })

  it('prioridad 4: todo cuadrado sin sobrante, sin mensaje', () => {
    const baldeExacto = { gastado: 200, techo: 200 }
    const baldes = { necesidad: baldeExacto, gusto: baldeExacto, ahorro: baldeExacto }
    expect(generarConsejos({ baldes, metasAhorro: [] })).toEqual([])
  })

  it('nunca devuelve más de 2 mensajes', () => {
    const baldes = { necesidad: baldeExcedido, gusto: baldeExcedido, ahorro: baldeOk }
    const mensajes = generarConsejos({ baldes, metasAhorro: [] })
    expect(mensajes.length).toBeLessThanOrEqual(2)
  })
})
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `cd frontend && npm run test -- consejos`
Expected: FAIL — módulo no existe

- [ ] **Step 3: Implementar**

`frontend/src/lib/consejos.js`:
```js
/**
 * Motor de consejos basado en reglas, sin IA. Máx 2 mensajes, en orden de prioridad.
 * @param {Object} params
 * @param {Object} params.baldes  {necesidad, gusto, ahorro} de computeBudgetSplit
 * @param {Array<{nombre, monto_meta, monto_actual}>} params.metasAhorro
 * @returns {string[]}
 */
export function generarConsejos({ baldes, metasAhorro = [] }) {
  const excedidos = ['necesidad', 'gusto'].filter(b => baldes[b].gastado > baldes[b].techo)
  if (excedidos.length > 0) {
    const nombres = { necesidad: 'necesidades', gusto: 'gustos' }
    const partes = excedidos.map(b => {
      const exceso = baldes[b].gastado - baldes[b].techo
      return `${nombres[b]} por ₡${Math.round(exceso).toLocaleString('es-CR')}`
    })
    return [`Este mes ya pasaste el límite de ${partes.join(' y ')}.`]
  }

  const libreGusto = baldes.gusto.techo - baldes.gusto.gastado
  if (libreGusto > 0) {
    const metaActiva = metasAhorro.find(m => m.monto_actual < m.monto_meta)
    if (metaActiva) {
      const faltante = metaActiva.monto_meta - metaActiva.monto_actual
      const meses = Math.ceil(faltante / libreGusto)
      return [
        `Te quedan ₡${Math.round(libreGusto).toLocaleString('es-CR')} libres en gustos. A este ritmo le faltan ${meses} ${meses === 1 ? 'mes' : 'meses'} a tu meta "${metaActiva.nombre}" — capaz mandás parte pa' allá.`
      ]
    }
    return [`Te quedan ₡${Math.round(libreGusto).toLocaleString('es-CR')} libres este mes.`]
  }

  return []
}
```

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `cd frontend && npm run test -- consejos`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/lib/consejos.js src/lib/consejos.test.js
git commit -m "feat: agregar motor de consejos basado en reglas"
```

---

### Task 8: `hooks/useProfilePreferences.js`

**Files:**
- Create: `frontend/src/hooks/useProfilePreferences.js`

**Interfaces:**
- Consumes: tabla `perfiles` (Task 2 agrega la policy que esto necesita).
- Produces: `useProfilePreferences(user) -> { preferencias: {categoria_baldes, porcentajes_balde}, loading, syncError, updatePreferencias(updates) }`. Usado por Task 9 (`useBudgetSplit`), Task 13 (`Budget.jsx`), Task 15 (`Settings.jsx`).

- [ ] **Step 1: Implementar**

`frontend/src/hooks/useProfilePreferences.js`:
```js
import { useState, useEffect } from 'react'
import localforage from 'localforage'
import { supabase } from '../lib/supabaseClient'

const preferenciasStore = localforage.createInstance({
  name: 'PolloAsado',
  storeName: 'preferencias'
})

const DEFAULT_CATEGORIA_BALDES = {
  Vivienda: 'necesidad',
  Servicios: 'necesidad',
  Salud: 'necesidad',
  Transporte: 'necesidad',
  Alimentación: 'necesidad',
  Entretenimiento: 'gusto',
  Ropa: 'gusto',
  Educación: 'gusto',
  Otros: 'gusto'
}

const DEFAULT_PORCENTAJES_BALDE = { necesidad: 50, gusto: 30, ahorro: 20 }

export function useProfilePreferences(user) {
  const [preferencias, setPreferencias] = useState({
    categoria_baldes: DEFAULT_CATEGORIA_BALDES,
    porcentajes_balde: DEFAULT_PORCENTAJES_BALDE
  })
  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      const cached = await preferenciasStore.getItem('preferencias')
      if (cached && isMounted) setPreferencias(cached)

      if (!user) { if (isMounted) setLoading(false); return }

      const { data, error } = await supabase
        .from('perfiles')
        .select('preferencias')
        .eq('id', user.id)
        .maybeSingle()

      if (!isMounted) return

      if (error) {
        setSyncError(
          navigator.onLine
            ? 'No se pudieron traer tus preferencias de la nube. Mostrando la copia local.'
            : 'Sin conexión. Mostrando la copia guardada en este dispositivo.'
        )
        setLoading(false)
        return
      }

      // data === null: todavía no existe fila de perfiles para este usuario
      // (nada la crea en el signup hoy). El primer updatePreferencias la crea.
      if (data) {
        const remote = data.preferencias || {}
        const merged = {
          categoria_baldes: remote.categoria_baldes || DEFAULT_CATEGORIA_BALDES,
          porcentajes_balde: remote.porcentajes_balde || DEFAULT_PORCENTAJES_BALDE
        }
        setPreferencias(merged)
        await preferenciasStore.setItem('preferencias', merged)
      }
      setSyncError(null)
      setLoading(false)
    }
    load()
    return () => { isMounted = false }
  }, [user])

  const updatePreferencias = async (updates) => {
    const merged = { ...preferencias, ...updates }
    setPreferencias(merged)
    await preferenciasStore.setItem('preferencias', merged)

    if (!user) return

    const { data: current } = await supabase
      .from('perfiles')
      .select('preferencias')
      .eq('id', user.id)
      .maybeSingle()

    const { error } = await supabase
      .from('perfiles')
      .upsert({ id: user.id, preferencias: { ...(current?.preferencias || {}), ...merged } }, { onConflict: 'id' })

    if (error) {
      console.error('No se pudo guardar preferencias en la nube:', error)
      setSyncError('No se pudo guardar en la nube. Tus cambios siguen acá; reintentá al volver a tener señal.')
    } else {
      setSyncError(null)
    }
  }

  return { preferencias, loading, syncError, updatePreferencias }
}
```

- [ ] **Step 2: Commit**

```bash
cd frontend && git add src/hooks/useProfilePreferences.js
git commit -m "feat: agregar useProfilePreferences con sync a perfiles.preferencias"
```

---

### Task 9: `hooks/useBudgetSplit.js`

**Files:**
- Create: `frontend/src/hooks/useBudgetSplit.js`

**Interfaces:**
- Consumes: `computeBudgetSplit` (Task 6), `monthRange` (Task 4), `fetchRangeTotals`/`fetchTotalsByCategory` (`frontend/src/lib/stats.js`, ya existen), `useStats` (`frontend/src/hooks/useStats.js`, ya existe), `computePendingSplit` (`frontend/src/lib/balance.js`, ya existe), `preferencias.categoria_baldes`/`porcentajes_balde` (Task 8).
- Produces: `useBudgetSplit(preferencias, incomes, outcomes, anio?, mes?) -> { baldes, ingresoMensual, loading, stale, error, hasIngreso, start, end, ym }`. Usado por Task 13 (`Budget.jsx`).

- [ ] **Step 1: Implementar**

`frontend/src/hooks/useBudgetSplit.js`:
```js
import { useMemo } from 'react'
import { useStats } from './useStats'
import { fetchRangeTotals, fetchTotalsByCategory } from '../lib/stats'
import { computePendingSplit } from '../lib/balance'
import { monthRange } from '../lib/period'
import { computeBudgetSplit } from '../lib/budgetSplit'
import { toNumber } from '../lib/format'

/**
 * Balde 50/30/20 del mes indicado (default: mes actual).
 * @param {{categoria_baldes, porcentajes_balde}} preferencias
 * @param {Array} incomes  ingresos locales, pa' el delta pendiente del mes
 * @param {Array} outcomes gastos locales, pa' el delta pendiente del mes
 * @param {number} [anio]
 * @param {number} [mes]
 */
export function useBudgetSplit(preferencias, incomes = [], outcomes = [], anio, mes) {
  const now = new Date()
  const targetAnio = anio ?? now.getFullYear()
  const targetMes = mes ?? now.getMonth() + 1

  const { start, end, ym } = useMemo(() => monthRange(targetAnio, targetMes), [targetAnio, targetMes])

  const { data: rangeTotals, loading: loadingIngreso, error: errorIngreso, stale: staleIngreso } = useStats(
    () => fetchRangeTotals({ start, end }),
    [start, end],
    `range:${ym}`
  )

  const { data: byCategory, loading: loadingCategorias, error: errorCategorias, stale: staleCategorias } = useStats(
    () => fetchTotalsByCategory({ tipo: 'gasto', start, end }),
    [start, end],
    `by-category:gasto:${ym}`
  )

  const pending = useMemo(
    () => computePendingSplit(incomes, outcomes, { from: start, to: end }),
    [incomes, outcomes, start, end]
  )

  const ingresoMensual = toNumber(rangeTotals?.totalIngresos) + pending.ingresos

  const baldes = useMemo(
    () => computeBudgetSplit({
      totalsByCategory: byCategory || [],
      categoriaBaldes: preferencias.categoria_baldes,
      porcentajesBalde: preferencias.porcentajes_balde,
      ingresoMensual
    }),
    [byCategory, preferencias.categoria_baldes, preferencias.porcentajes_balde, ingresoMensual]
  )

  return {
    baldes,
    ingresoMensual,
    loading: loadingIngreso || loadingCategorias,
    stale: staleIngreso || staleCategorias,
    error: errorIngreso || errorCategorias,
    hasIngreso: ingresoMensual > 0,
    start,
    end,
    ym
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd frontend && git add src/hooks/useBudgetSplit.js
git commit -m "feat: agregar useBudgetSplit"
```

---

### Task 10: `hooks/useSavings.js`

**Files:**
- Create: `frontend/src/hooks/useSavings.js`

**Interfaces:**
- Consumes: tabla `ahorros` (ya existe en `squema.sql`/`rls.sql`, sin cambios de esquema).
- Produces: `useSavings(user) -> { savings, loading, isSyncing, syncError, addSaving(formData), updateSaving(id, formData), abonarSaving(id, monto) }`. Cada item de `savings` tiene shape DB directo: `{id, user_id, nombre, monto_meta, monto_actual, es_automatico, frecuencia, monto_automatico, created_at}`. Usado por Task 14 (`Savings.jsx`) y Task 7/13 (consejos, como `metasAhorro`).

- [ ] **Step 1: Implementar**

`frontend/src/hooks/useSavings.js`:
```js
import { useState, useEffect } from 'react'
import localforage from 'localforage'
import { supabase } from '../lib/supabaseClient'
import { toNumber } from '../lib/format'

const savingsStore = localforage.createInstance({
  name: 'PolloAsado',
  storeName: 'savings'
})

export function useSavings(user) {
  const [savings, setSavings] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState(null)

  const persist = async (list) => {
    try {
      await savingsStore.setItem('savings_list', list)
    } catch (err) {
      console.error('No se pudo guardar la caché de metas de ahorro:', err)
      setSyncError('No se pudo guardar en este dispositivo. Sincronizá antes de cerrar la app.')
    }
  }

  const loadLocalData = async () => {
    let localData = []
    try {
      localData = (await savingsStore.getItem('savings_list')) || []
    } catch (err) {
      console.error('No se pudo leer la caché de metas de ahorro:', err)
      setSyncError('No se pudo leer el almacenamiento de este dispositivo.')
    }
    setSavings(localData)
    setLoading(false)
    return localData
  }

  const pullRemote = async () => {
    if (!user) return null
    const { data: remote, error: fetchError } = await supabase
      .from('ahorros')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError || !remote) {
      console.error('Error trayendo metas de ahorro:', fetchError)
      setSyncError(
        navigator.onLine
          ? 'No se pudieron traer tus metas de ahorro de la nube. Estás viendo la copia local.'
          : 'Sin conexión. Estás viendo la copia guardada en este dispositivo.'
      )
      return null
    }

    const formattedRemote = remote.map(item => ({ ...item, _isPendingSync: false }))

    const localData = (await savingsStore.getItem('savings_list')) || []
    const remoteIds = new Set(formattedRemote.map(r => r.id))
    const pendingKept = localData.filter(l => l._isPendingSync && !remoteIds.has(l.id))
    const merged = [...pendingKept, ...formattedRemote]

    setSyncError(null)
    await persist(merged)
    setSavings(merged)
    return merged.length
  }

  const syncWithSupabase = async (localData) => {
    if (!user) return
    setIsSyncing(true)
    let failedPushes = 0

    try {
      const pendingItems = localData.filter(item => item._isPendingSync)

      for (const item of pendingItems) {
        const syncType = item._isPendingSync
        const { _isPendingSync, ...dbData } = item

        if (syncType === 'UPDATE') {
          const { error: updateError } = await supabase.from('ahorros').update(dbData).eq('id', item.id)
          if (updateError) { console.error('Error actualizando meta de ahorro:', updateError); failedPushes++; continue }
        } else {
          const { error: insertError } = await supabase.from('ahorros').insert([dbData])
          if (insertError) { console.error('Error insertando meta de ahorro:', insertError); failedPushes++; continue }
        }
      }

      await pullRemote()

      if (failedPushes > 0) {
        setSyncError(
          failedPushes === 1
            ? 'Una meta de ahorro quedó guardada solo en este dispositivo. Se reintentará.'
            : `${failedPushes} metas de ahorro quedaron guardadas solo en este dispositivo. Se reintentarán.`
        )
      }
    } catch (error) {
      console.error('Fallo en sincronización de metas de ahorro:', error)
      setSyncError(
        navigator.onLine
          ? 'No se pudo sincronizar con la nube. Tus datos siguen guardados aquí.'
          : 'Sin conexión. Tus cambios se subirán cuando vuelva la señal.'
      )
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    loadLocalData().then(localData => {
      if (isMounted) syncWithSupabase(localData)
    })
    return () => { isMounted = false }
  }, [user])

  const addSaving = async (formData) => {
    if (!user) return
    const newItem = {
      id: crypto.randomUUID(),
      user_id: user.id,
      nombre: formData.nombre,
      monto_meta: toNumber(formData.monto_meta),
      monto_actual: toNumber(formData.monto_actual),
      es_automatico: !!formData.es_automatico,
      frecuencia: formData.es_automatico ? formData.frecuencia : null,
      monto_automatico: formData.es_automatico ? toNumber(formData.monto_automatico) : null,
      _isPendingSync: true
    }
    const updated = [newItem, ...savings]
    setSavings(updated)
    await persist(updated)
    syncWithSupabase(updated)
  }

  const updateSaving = async (id, formData) => {
    if (!user) return
    const updated = savings.map(s => s.id === id ? {
      ...s,
      nombre: formData.nombre,
      monto_meta: toNumber(formData.monto_meta),
      es_automatico: !!formData.es_automatico,
      frecuencia: formData.es_automatico ? formData.frecuencia : null,
      monto_automatico: formData.es_automatico ? toNumber(formData.monto_automatico) : null,
      _isPendingSync: s._isPendingSync === true ? true : 'UPDATE'
    } : s)
    setSavings(updated)
    await persist(updated)
    syncWithSupabase(updated)
  }

  const abonarSaving = async (id, monto) => {
    if (!user) return
    const target = savings.find(s => s.id === id)
    if (!target) return
    const updated = savings.map(s => s.id === id ? {
      ...s,
      monto_actual: toNumber(s.monto_actual) + toNumber(monto),
      _isPendingSync: s._isPendingSync === true ? true : 'UPDATE'
    } : s)
    setSavings(updated)
    await persist(updated)
    syncWithSupabase(updated)
  }

  return { savings, loading, isSyncing, syncError, addSaving, updateSaving, abonarSaving }
}
```

- [ ] **Step 2: Commit**

```bash
cd frontend && git add src/hooks/useSavings.js
git commit -m "feat: agregar useSavings con CRUD offline-first pa' metas de ahorro"
```

---

### Task 11: `OutcomeForm.jsx` — checkbox de fijo, día esperado, continuar fijo existente

**Files:**
- Modify: `frontend/src/components/Outcome/OutcomeForm.jsx`
- Modify: `frontend/src/hooks/useOutcomes.js`

**Interfaces:**
- Consumes: `CATEGORIAS_GASTO` (Task 3), `getFixedExpenseTemplates` (Task 5).
- Produces: `formData.es_fijo: boolean`, `formData.dia_esperado: string`, `formData.grupo_recurrencia: string|null` disponibles en el objeto que `addOutcome`/`updateOutcome` reciben.

- [ ] **Step 1: Reemplazar categorías hardcodeadas por la constante compartida**

En `frontend/src/components/Outcome/OutcomeForm.jsx`, agregar import:
```js
import { CATEGORIAS_GASTO } from '../../lib/categorias'
```

Reemplazar (líneas 387-396):
```jsx
                                <option value="">Elegí una categoría</option>
                                <option value="Alimentación">Alimentación</option>
                                <option value="Vivienda">Vivienda</option>
                                <option value="Transporte">Transporte</option>
                                <option value="Salud">Salud</option>
                                <option value="Entretenimiento">Entretenimiento</option>
                                <option value="Educación">Educación</option>
                                <option value="Ropa">Ropa</option>
                                <option value="Servicios">Servicios</option>
                                <option value="Otros">Otros</option>
```
por:
```jsx
                                <option value="">Elegí una categoría</option>
                                {CATEGORIAS_GASTO.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
```

- [ ] **Step 2: Agregar campos de fijo a `formData` y al hook `useOutcomes`**

En `frontend/src/hooks/useOutcomes.js`, en `addOutcome` (dentro del objeto `newItems`, junto a los otros campos DB), agregar:
```js
            es_fijo: !!formData.es_fijo,
            dia_esperado: formData.es_fijo ? toNumber(formData.dia_esperado, null) : null,
            grupo_recurrencia: formData.es_fijo ? (formData.grupo_recurrencia || crypto.randomUUID()) : null,
```

En `updateOutcome`, dentro del `.map()` que arma el item actualizado, agregar las mismas tres líneas.

- [ ] **Step 3: Import y destructuring en OutcomeForm**

Agregar import:
```js
import { getFixedExpenseTemplates } from '../../lib/fixedExpenses'
import { useMemo } from 'react'
```
(`useMemo` se agrega al import ya existente de `'react'` en la línea 1, no como línea nueva.)

Cambiar línea 24:
```js
const { addOutcome, updateOutcome } = useOutcomes(user)
```
a:
```js
const { outcomes, addOutcome, updateOutcome } = useOutcomes(user)
const fixedTemplates = useMemo(() => getFixedExpenseTemplates(outcomes), [outcomes])
```

- [ ] **Step 4: Agregar campos a `formData` inicial**

En el `useState(formData)` inicial (línea 29-39), agregar:
```js
        es_fijo: initialData?.es_fijo || false,
        dia_esperado: initialData?.dia_esperado || '',
        grupo_recurrencia: initialData?.grupo_recurrencia || null,
```

- [ ] **Step 5: Validación**

En `validate()`, agregar antes del `return errors`:
```js
        if (formData.es_fijo) {
            const dia = toNumber(formData.dia_esperado, NaN)
            if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
                errors.dia_esperado = 'Poné un día entre 1 y 31.'
            }
        }
```

- [ ] **Step 6: UI — checkbox, día esperado, selector de fijo existente**

Dentro de la Card 2 "Clasificación" (después del bloque de `<select name="account">` y antes del bloque de "Notas", ambos ya existentes), agregar:
```jsx
                                <div className="flex flex-col gap-2 pt-4 border-t border-border-app/20">
                                    <label className="relative inline-flex items-center gap-3 cursor-pointer select-none">
                                        <input type="checkbox" name="es_fijo" className="sr-only peer" checked={formData.es_fijo} onChange={handleChange} />
                                        <div className="w-11 h-6 bg-surface-app/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-secondary peer-checked:after:bg-bg-app after:border-border-app after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-app"></div>
                                        <span className="text-sm font-semibold text-text-primary">Es un gasto fijo</span>
                                    </label>

                                    {formData.es_fijo && (
                                        <div className="flex flex-col gap-4 mt-2">
                                            <div className="flex flex-col gap-2">
                                                <label htmlFor="dia_esperado" className="text-sm font-semibold text-text-secondary ml-1">Día esperado del mes</label>
                                                <input
                                                    type="number"
                                                    id="dia_esperado"
                                                    name="dia_esperado"
                                                    value={formData.dia_esperado}
                                                    onChange={handleChange}
                                                    min="1"
                                                    max="31"
                                                    placeholder="Ej. 15"
                                                    aria-invalid={!!fieldErrors.dia_esperado}
                                                    aria-describedby={fieldErrors.dia_esperado ? 'dia_esperado-error' : undefined}
                                                    className="input w-full sm:w-40 font-mono"
                                                />
                                                {fieldErrors.dia_esperado && (
                                                    <p id="dia_esperado-error" className="text-xs text-negative ml-1">{fieldErrors.dia_esperado}</p>
                                                )}
                                            </div>

                                            {!isEditing && fixedTemplates.length > 0 && (
                                                <div className="flex flex-col gap-2">
                                                    <label htmlFor="continuarFijo" className="text-sm font-semibold text-text-secondary ml-1">¿Es continuación de un fijo existente?</label>
                                                    <select
                                                        id="continuarFijo"
                                                        value={formData.grupo_recurrencia || ''}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, grupo_recurrencia: e.target.value || null }))}
                                                        className="input cursor-pointer"
                                                    >
                                                        <option value="">No, es un fijo nuevo</option>
                                                        {fixedTemplates.map(t => (
                                                            <option key={t.grupo_recurrencia} value={t.grupo_recurrencia}>
                                                                {t.concept} ({t.category})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
```

- [ ] **Step 7: Verificar build**

Run: `cd frontend && npm run build`
Expected: build exitoso sin errores de sintaxis JSX.

- [ ] **Step 8: Commit**

```bash
cd frontend && git add src/components/Outcome/OutcomeForm.jsx src/hooks/useOutcomes.js
git commit -m "feat: agregar checkbox de gasto fijo, día esperado y continuación de fijo existente"
```

---

### Task 12: Componentes de Budget — checklist de fijos y balde 50/30/20

**Files:**
- Create: `frontend/src/components/Budget/FixedExpensesChecklist.jsx`
- Create: `frontend/src/components/Budget/BaldeBar.jsx`
- Create: `frontend/src/components/Budget/BudgetSplitCard.jsx`

**Interfaces:**
- Consumes: `computeFixedExpensesStatus`/`fijos` shape (Task 5), `baldes` shape (Task 6/9). Componentes presentacionales — reciben todo por props, mismo patrón que `Dashboard/CurrentBalance.jsx`.
- Produces: `<FixedExpensesChecklist fijos hayAtrasados loading currency />`, `<BaldeBar baldes />`, `<BudgetSplitCard baldes ingresoMensual loading hasIngreso currency />`. Usados por Task 13 (`Budget.jsx`).

- [ ] **Step 1: `FixedExpensesChecklist.jsx`**

```jsx
import { CheckCircle2, Circle } from 'lucide-react'
import { formatMoney } from '../../lib/format'

export default function FixedExpensesChecklist({ fijos = [], hayAtrasados = false, loading, currency = 'CRC' }) {
    if (loading) {
        return (
            <div className="card flex flex-col gap-4" aria-busy="true">
                <div className="skeleton h-5 w-32" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-full" />
            </div>
        )
    }

    return (
        <div className="card flex flex-col gap-4">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">Gastos fijos este mes</h3>

            {hayAtrasados && (
                <p className="notice-warning" role="alert">Se pasó la fecha esperada de algún fijo pendiente.</p>
            )}

            {fijos.length === 0 ? (
                <p className="text-sm text-text-secondary">Todavía no tenés gastos fijos marcados.</p>
            ) : (
                <ul className="flex flex-col gap-2">
                    {fijos.map(f => (
                        <li key={f.grupo_recurrencia} className="flex items-center justify-between gap-3 bg-bg-app rounded-xl px-4 py-3 border border-border-app/30">
                            <div className="flex items-center gap-3 min-w-0">
                                {f.pagado ? (
                                    <CheckCircle2 className="size-5 shrink-0 text-positive" aria-hidden="true" />
                                ) : (
                                    <Circle className={`size-5 shrink-0 ${f.atrasado ? 'text-negative' : 'text-text-secondary'}`} aria-hidden="true" />
                                )}
                                <span className="user-text text-sm text-text-primary truncate" title={f.concept}>{f.concept}</span>
                            </div>
                            <span className="num font-mono text-sm font-bold text-text-secondary shrink-0">
                                {formatMoney(f.amount, currency, { absolute: true })}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
```

- [ ] **Step 2: `BaldeBar.jsx`**

```jsx
const COLORS = {
    necesidad: 'bg-accent-app',
    gusto: 'bg-positive',
    ahorro: 'bg-warning'
}

/** Barra de 3 segmentos, proporcional al gasto de cada balde. Decorativa. */
export default function BaldeBar({ baldes }) {
    const total = baldes.necesidad.gastado + baldes.gusto.gastado + baldes.ahorro.gastado
    if (!total) return null

    return (
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-bg-app" aria-hidden="true">
            {['necesidad', 'gusto', 'ahorro'].map(balde => {
                const share = (baldes[balde].gastado / total) * 100
                if (share <= 0) return null
                return (
                    <div
                        key={balde}
                        className={`${COLORS[balde]} transition-[width] duration-200 ease-out`}
                        style={{ width: `${share}%` }}
                    />
                )
            })}
        </div>
    )
}
```

- [ ] **Step 3: `BudgetSplitCard.jsx`**

```jsx
import { formatMoney } from '../../lib/format'
import BaldeBar from './BaldeBar'

const LABELS = { necesidad: 'Necesidad', gusto: 'Gusto', ahorro: 'Ahorro' }

export default function BudgetSplitCard({ baldes, loading, hasIngreso, currency = 'CRC' }) {
    if (loading) {
        return (
            <div className="card flex flex-col gap-4" aria-busy="true">
                <div className="skeleton h-5 w-40" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-1.5 w-full" />
            </div>
        )
    }

    return (
        <div className="card flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">Reparto 50/30/20</h3>

            {!hasIngreso && (
                <p className="notice-warning" role="status">Registrá un ingreso este mes pa' ver el reparto.</p>
            )}

            <BaldeBar baldes={baldes} />

            <div className="flex flex-col gap-3">
                {['necesidad', 'gusto', 'ahorro'].map(balde => (
                    <div key={balde} className="flex items-baseline justify-between gap-3">
                        <span className="text-sm text-text-secondary">{LABELS[balde]}</span>
                        <span className={`num font-mono text-sm font-bold ${baldes[balde].gastado > baldes[balde].techo ? 'text-negative' : 'text-text-primary'}`}>
                            {formatMoney(baldes[balde].gastado, currency, { absolute: true })} / {formatMoney(baldes[balde].techo, currency, { absolute: true })}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
```

- [ ] **Step 4: Verificar build**

Run: `cd frontend && npm run build`
Expected: build exitoso.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/Budget/FixedExpensesChecklist.jsx src/components/Budget/BaldeBar.jsx src/components/Budget/BudgetSplitCard.jsx
git commit -m "feat: agregar componentes de checklist de fijos y balde 50/30/20"
```

---

### Task 13: `Budget.jsx` (página) + `ConsejosCard` + wiring en `Layout.jsx`

**Files:**
- Create: `frontend/src/components/Budget/ConsejosCard.jsx`
- Create: `frontend/src/components/Budget.jsx`
- Modify: `frontend/src/components/Layout.jsx`

**Interfaces:**
- Consumes: `useOutcomes`, `useIncomes`, `useProfilePreferences` (Task 8), `useBudgetSplit` (Task 9), `useSavings` (Task 10), `computeFixedExpensesStatus` (Task 5), `generarConsejos` (Task 7), `FixedExpensesChecklist`/`BudgetSplitCard` (Task 12).
- Produces: tab `budgets` en `Layout.jsx` renderiza `<Budget user={user} />` en vez del placeholder genérico.

- [ ] **Step 1: `ConsejosCard.jsx`**

```jsx
import { useMemo } from 'react'
import { generarConsejos } from '../../lib/consejos'

export default function ConsejosCard({ baldes, metasAhorro = [], loading }) {
    const mensajes = useMemo(
        () => (baldes ? generarConsejos({ baldes, metasAhorro }) : []),
        [baldes, metasAhorro]
    )

    if (loading || mensajes.length === 0) return null

    return (
        <div className="card flex flex-col gap-3">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">Consejos</h3>
            {mensajes.map((m, i) => (
                <p key={i} className="text-sm text-text-primary">{m}</p>
            ))}
        </div>
    )
}
```

- [ ] **Step 2: `Budget.jsx`**

```jsx
import { useMemo } from 'react'
import FixedExpensesChecklist from './Budget/FixedExpensesChecklist'
import BudgetSplitCard from './Budget/BudgetSplitCard'
import ConsejosCard from './Budget/ConsejosCard'
import { useOutcomes } from '../hooks/useOutcomes'
import { useIncomes } from '../hooks/useIncomes'
import { useProfilePreferences } from '../hooks/useProfilePreferences'
import { useBudgetSplit } from '../hooks/useBudgetSplit'
import { useSavings } from '../hooks/useSavings'
import { useSettings } from '../hooks/useSettings'
import { computeFixedExpensesStatus } from '../lib/fixedExpenses'
import { today } from '../lib/period'

export default function Budget({ user }) {
    const { outcomes, loading: loadingOut } = useOutcomes(user)
    const { incomes } = useIncomes(user)
    const { preferencias, loading: loadingPrefs } = useProfilePreferences(user)
    const { savings, loading: loadingSavings } = useSavings(user)
    const { settings } = useSettings()
    const baseCurrency = settings?.divisa_principal || 'CRC'

    const now = new Date()
    const { fijos, hayAtrasados } = useMemo(
        () => computeFixedExpensesStatus(outcomes, { anio: now.getFullYear(), mes: now.getMonth() + 1, hoy: today() }),
        [outcomes]
    )

    const { baldes, loading: loadingSplit, hasIngreso } = useBudgetSplit(preferencias, incomes, outcomes)

    return (
        <div className="w-full flex-1 flex flex-col gap-8">
            <h2 className="heading">Presupuestos</h2>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-8">
                <FixedExpensesChecklist fijos={fijos} hayAtrasados={hayAtrasados} loading={loadingOut} currency={baseCurrency} />
                <BudgetSplitCard baldes={baldes} loading={loadingSplit || loadingPrefs} hasIngreso={hasIngreso} currency={baseCurrency} />
            </div>

            <ConsejosCard baldes={baldes} metasAhorro={savings} loading={loadingSplit || loadingSavings} />
        </div>
    )
}
```

- [ ] **Step 3: Wiring en `Layout.jsx`**

Agregar import junto a los otros imports de componentes:
```js
import Budget from './Budget'
```

En la cadena `if/else if` del `<main>` (línea 176-213), agregar una rama antes del `else` final (catch-all):
```jsx
          ) : activeTab === 'budgets' ? (
            <Budget user={user} />
```

- [ ] **Step 4: Verificar build**

Run: `cd frontend && npm run build`
Expected: build exitoso.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/Budget/ConsejosCard.jsx src/components/Budget.jsx src/components/Layout.jsx
git commit -m "feat: armar página de Presupuestos y conectar el tab"
```

---

### Task 14: Componentes de Savings + página + wiring en `Layout.jsx`

**Files:**
- Create: `frontend/src/components/Savings/AhorroForm.jsx`
- Create: `frontend/src/components/Savings/AhorroList.jsx`
- Create: `frontend/src/components/Savings.jsx`
- Modify: `frontend/src/components/Layout.jsx`

**Interfaces:**
- Consumes: `useSavings` (Task 10).
- Produces: tab `savings` en `Layout.jsx` renderiza `<Savings user={user} />` en vez del placeholder genérico.

- [ ] **Step 1: `AhorroForm.jsx`**

```jsx
import { useState } from 'react'
import { toNumber } from '../../lib/format'

const MAX_NOMBRE = 60

export default function AhorroForm({ initialData, onSubmit, onCancel }) {
    const isEditing = !!initialData
    const [formData, setFormData] = useState({
        nombre: initialData?.nombre || '',
        monto_meta: initialData?.monto_meta || '',
        monto_actual: initialData?.monto_actual || '0',
        es_automatico: initialData?.es_automatico || false,
        frecuencia: initialData?.frecuencia || 'mensual',
        monto_automatico: initialData?.monto_automatico || ''
    })
    const [fieldErrors, setFieldErrors] = useState({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    }

    const validate = () => {
        const errors = {}
        const nombre = formData.nombre.trim()
        if (!nombre) errors.nombre = 'Ponele un nombre a esta meta.'
        else if (nombre.length > MAX_NOMBRE) errors.nombre = `Máximo ${MAX_NOMBRE} caracteres.`

        const meta = toNumber(formData.monto_meta, NaN)
        if (!Number.isFinite(meta) || meta <= 0) errors.monto_meta = 'Escribí un monto meta mayor que cero.'

        if (!isEditing) {
            const actual = toNumber(formData.monto_actual, NaN)
            if (!Number.isFinite(actual) || actual < 0) errors.monto_actual = 'Escribí un monto inicial válido (o dejalo en 0).'
        }

        if (formData.es_automatico) {
            const automatico = toNumber(formData.monto_automatico, NaN)
            if (!Number.isFinite(automatico) || automatico <= 0) errors.monto_automatico = 'Escribí cuánto se abona automáticamente.'
        }

        return errors
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (isSubmitting) return
        const errors = validate()
        setFieldErrors(errors)
        if (Object.keys(errors).length > 0) return

        setIsSubmitting(true)
        await onSubmit({ ...formData, nombre: formData.nombre.trim() })
        setIsSubmitting(false)
    }

    return (
        <form onSubmit={handleSubmit} className="card flex flex-col gap-6 w-full max-w-xl">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">
                {isEditing ? 'Editar meta' : 'Nueva meta de ahorro'}
            </h3>

            <div className="flex flex-col gap-2">
                <label htmlFor="nombre" className="text-sm font-semibold text-text-secondary ml-1">Nombre *</label>
                <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Ej. Fondo de emergencia"
                    maxLength={MAX_NOMBRE}
                    aria-invalid={!!fieldErrors.nombre}
                    className="input"
                />
                {fieldErrors.nombre && <p className="text-xs text-negative ml-1">{fieldErrors.nombre}</p>}
            </div>

            <div className="flex flex-col gap-2">
                <label htmlFor="monto_meta" className="text-sm font-semibold text-text-secondary ml-1">Monto meta *</label>
                <input
                    type="number"
                    id="monto_meta"
                    name="monto_meta"
                    value={formData.monto_meta}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    aria-invalid={!!fieldErrors.monto_meta}
                    className="input font-mono"
                />
                {fieldErrors.monto_meta && <p className="text-xs text-negative ml-1">{fieldErrors.monto_meta}</p>}
            </div>

            {!isEditing && (
                <div className="flex flex-col gap-2">
                    <label htmlFor="monto_actual" className="text-sm font-semibold text-text-secondary ml-1">Monto actual</label>
                    <input
                        type="number"
                        id="monto_actual"
                        name="monto_actual"
                        value={formData.monto_actual}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        aria-invalid={!!fieldErrors.monto_actual}
                        className="input font-mono"
                    />
                    {fieldErrors.monto_actual && <p className="text-xs text-negative ml-1">{fieldErrors.monto_actual}</p>}
                </div>
            )}

            <div className="flex flex-col gap-2 pt-4 border-t border-border-app/20">
                <label className="relative inline-flex items-center gap-3 cursor-pointer select-none">
                    <input type="checkbox" name="es_automatico" className="sr-only peer" checked={formData.es_automatico} onChange={handleChange} />
                    <div className="w-11 h-6 bg-surface-app/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-secondary peer-checked:after:bg-bg-app after:border-border-app after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-app"></div>
                    <span className="text-sm font-semibold text-text-primary">Abono automático</span>
                </label>

                {formData.es_automatico && (
                    <div className="flex gap-3 mt-2">
                        <select name="frecuencia" value={formData.frecuencia} onChange={handleChange} className="input cursor-pointer">
                            <option value="semanal">Semanal</option>
                            <option value="quincenal">Quincenal</option>
                            <option value="mensual">Mensual</option>
                        </select>
                        <input
                            type="number"
                            name="monto_automatico"
                            value={formData.monto_automatico}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            placeholder="Monto"
                            className="input flex-1 font-mono"
                        />
                    </div>
                )}
                {fieldErrors.monto_automatico && <p className="text-xs text-negative ml-1">{fieldErrors.monto_automatico}</p>}
            </div>

            <div className="flex gap-3 mt-2">
                <button type="button" onClick={onCancel} disabled={isSubmitting} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                    {isSubmitting ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear meta'}
                </button>
            </div>
        </form>
    )
}
```

- [ ] **Step 2: `AhorroList.jsx`**

```jsx
import { useState } from 'react'
import { formatMoney } from '../../lib/format'

function ProgressBar({ actual, meta }) {
    const pct = meta > 0 ? Math.min(100, (actual / meta) * 100) : 0
    return (
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-bg-app" aria-hidden="true">
            <div className="bg-positive transition-[width] duration-200 ease-out" style={{ width: `${pct}%` }} />
        </div>
    )
}

export default function AhorroList({ savings = [], loading, onEdit, onAbonar, currency = 'CRC' }) {
    const [abonoInputs, setAbonoInputs] = useState({})

    if (loading) {
        return (
            <div className="flex flex-col gap-4">
                <div className="card skeleton h-24 w-full" aria-busy="true" />
                <div className="card skeleton h-24 w-full" aria-busy="true" />
            </div>
        )
    }

    if (savings.length === 0) {
        return (
            <div className="card flex flex-col items-center justify-center gap-2 min-h-[200px] text-center border-dashed">
                <p className="text-text-secondary">Todavía no tenés metas de ahorro. Creá la primera arriba.</p>
            </div>
        )
    }

    const handleAbonar = (id) => {
        const monto = parseFloat(abonoInputs[id])
        if (!Number.isFinite(monto) || monto <= 0) return
        onAbonar(id, monto)
        setAbonoInputs(prev => ({ ...prev, [id]: '' }))
    }

    return (
        <div className="flex flex-col gap-4">
            {savings.map(s => (
                <div key={s.id} className="card flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <span className="user-text text-lg font-bold text-text-primary truncate" title={s.nombre}>{s.nombre}</span>
                        <button type="button" onClick={() => onEdit(s)} className="text-sm font-semibold text-accent-app hover:underline shrink-0">Editar</button>
                    </div>

                    <ProgressBar actual={s.monto_actual} meta={s.monto_meta} />

                    <div className="flex items-baseline justify-between text-sm">
                        <span className="num font-mono font-bold text-text-primary">
                            {formatMoney(s.monto_actual, currency, { absolute: true })}
                        </span>
                        <span className="text-text-secondary">
                            de {formatMoney(s.monto_meta, currency, { absolute: true })}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={abonoInputs[s.id] || ''}
                            onChange={(e) => setAbonoInputs(prev => ({ ...prev, [s.id]: e.target.value }))}
                            placeholder="Abonar monto"
                            step="0.01"
                            min="0"
                            className="input flex-1 font-mono"
                        />
                        <button type="button" onClick={() => handleAbonar(s.id)} className="btn-secondary">Abonar</button>
                    </div>
                </div>
            ))}
        </div>
    )
}
```

- [ ] **Step 3: `Savings.jsx`**

```jsx
import { useState } from 'react'
import { useSavings } from '../hooks/useSavings'
import { useSettings } from '../hooks/useSettings'
import AhorroForm from './Savings/AhorroForm'
import AhorroList from './Savings/AhorroList'

export default function Savings({ user }) {
    const { savings, loading, syncError, addSaving, updateSaving, abonarSaving } = useSavings(user)
    const { settings } = useSettings()
    const baseCurrency = settings?.divisa_principal || 'CRC'
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState(null)

    const handleSubmit = async (formData) => {
        if (editing) await updateSaving(editing.id, formData)
        else await addSaving(formData)
        setShowForm(false)
        setEditing(null)
    }

    return (
        <div className="w-full flex-1 flex flex-col gap-8">
            <div className="flex items-center justify-between gap-4">
                <h2 className="heading">Ahorros</h2>
                {!showForm && (
                    <button type="button" onClick={() => setShowForm(true)} className="btn-primary">Nueva meta</button>
                )}
            </div>

            {syncError && <p className="notice-warning" role="status">{syncError}</p>}

            {showForm ? (
                <AhorroForm
                    initialData={editing}
                    onSubmit={handleSubmit}
                    onCancel={() => { setShowForm(false); setEditing(null) }}
                />
            ) : (
                <AhorroList
                    savings={savings}
                    loading={loading}
                    onEdit={(item) => { setEditing(item); setShowForm(true) }}
                    onAbonar={abonarSaving}
                    currency={baseCurrency}
                />
            )}
        </div>
    )
}
```

- [ ] **Step 4: Wiring en `Layout.jsx`**

Agregar import:
```js
import Savings from './Savings'
```

En la cadena `if/else if` del `<main>`, agregar rama (junto a la de `budgets` agregada en Task 13):
```jsx
          ) : activeTab === 'savings' ? (
            <Savings user={user} />
```

- [ ] **Step 5: Verificar build**

Run: `cd frontend && npm run build`
Expected: build exitoso.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/components/Savings/AhorroForm.jsx src/components/Savings/AhorroList.jsx src/components/Savings.jsx src/components/Layout.jsx
git commit -m "feat: armar página de Ahorros y conectar el tab"
```

---

### Task 15: Sección "Baldes" en `Settings.jsx`

**Files:**
- Modify: `frontend/src/components/Settings.jsx`

**Interfaces:**
- Consumes: `useProfilePreferences` (Task 8), `CATEGORIAS_GASTO` (Task 3), `toNumber` (`frontend/src/lib/format.js`, ya existe).

- [ ] **Step 1: Imports**

En `frontend/src/components/Settings.jsx`, agregar:
```js
import { useProfilePreferences } from '../hooks/useProfilePreferences'
import { CATEGORIAS_GASTO } from '../lib/categorias'
import { toNumber } from '../lib/format'
```

- [ ] **Step 2: Estado y handlers**

Dentro del componente `Settings`, junto a los otros hooks/estado (después de `const { settings, loading, updateSettings } = useSettings()`):
```js
  const { preferencias, loading: loadingPrefs, syncError: prefsSyncError, updatePreferencias } = useProfilePreferences(user)
  const [baldesDraft, setBaldesDraft] = useState(null)
  const [porcentajesDraft, setPorcentajesDraft] = useState(null)
  const [baldesError, setBaldesError] = useState(null)

  const categoriaBaldes = baldesDraft || preferencias.categoria_baldes
  const porcentajesBalde = porcentajesDraft || preferencias.porcentajes_balde

  const handleBaldeChange = (categoria, balde) => {
    setBaldesDraft({ ...categoriaBaldes, [categoria]: balde })
  }

  const handlePorcentajeChange = (balde, value) => {
    setPorcentajesDraft({ ...porcentajesBalde, [balde]: toNumber(value, 0) })
  }

  const handleGuardarBaldes = async () => {
    const suma = (porcentajesBalde.necesidad || 0) + (porcentajesBalde.gusto || 0) + (porcentajesBalde.ahorro || 0)
    if (suma !== 100) {
      setBaldesError(`Los porcentajes suman ${suma}%. Tienen que sumar 100%.`)
      return
    }
    setBaldesError(null)
    await updatePreferencias({ categoria_baldes: categoriaBaldes, porcentajes_balde: porcentajesBalde })
    setBaldesDraft(null)
    setPorcentajesDraft(null)
  }
```

- [ ] **Step 3: Panel de UI**

En la "COLUMNA DERECHA" (después del panel de Divisas, dentro del mismo `<div className="flex flex-col gap-8">`), agregar:
```jsx
          {/* PANEL DE BALDES 50/30/20 */}
          <div className="card flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-primary pb-2 border-b border-border-app/30">Baldes 50/30/20</h3>
            <p className="text-sm text-text-secondary">Decidí en qué balde cae cada categoría de gasto y qué porcentaje del ingreso le toca a cada balde.</p>

            {prefsSyncError && <p className="notice-warning" role="status">{prefsSyncError}</p>}
            {baldesError && <p className="notice-negative" role="alert">{baldesError}</p>}

            {loadingPrefs ? (
              <div className="skeleton h-32 w-full" />
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {CATEGORIAS_GASTO.map(cat => (
                    <div key={cat} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-text-primary">{cat}</span>
                      <select
                        value={categoriaBaldes[cat] || 'gusto'}
                        onChange={(e) => handleBaldeChange(cat, e.target.value)}
                        className="input w-auto cursor-pointer"
                      >
                        <option value="necesidad">Necesidad</option>
                        <option value="gusto">Gusto</option>
                        <option value="ahorro">Ahorro</option>
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4 border-t border-border-app/20">
                  {['necesidad', 'gusto', 'ahorro'].map(balde => (
                    <div key={balde} className="flex flex-col gap-1 flex-1">
                      <label className="text-xs font-semibold text-text-secondary capitalize">{balde}</label>
                      <input
                        type="number"
                        value={porcentajesBalde[balde] ?? 0}
                        onChange={(e) => handlePorcentajeChange(balde, e.target.value)}
                        min="0"
                        max="100"
                        className="input font-mono"
                      />
                    </div>
                  ))}
                </div>

                <button type="button" onClick={handleGuardarBaldes} className="btn-primary mt-2">Guardar baldes</button>
              </>
            )}
          </div>
```

- [ ] **Step 4: Verificar build**

Run: `cd frontend && npm run build`
Expected: build exitoso.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/Settings.jsx
git commit -m "feat: agregar sección de baldes 50/30/20 en Ajustes"
```

---

## Self-Review

**Cobertura del spec:**
- Checklist + alerta de fijos → Task 5, 11 (captura), 12/13 (UI).
- Balde 50/30/20 → Task 6, 9, 12, 13.
- Metas de ahorro (CRUD, abonar, progreso) → Task 10, 14.
- Motor de consejos → Task 7, 13.
- Ajustes (mapeo baldes + porcentajes) → Task 8, 15.
- Modelo de datos (`dia_esperado`, `grupo_recurrencia`, defaults de `preferencias`) → Task 2.
- Estados vacíos/errores de cada sección → cubiertos en cada componente (Task 11-15) siguiendo el patrón de `CurrentBalance.jsx`.
- Fuera de alcance (import bancario, insights avanzados, hub de deseos, historial de abonos, generación automática de instancias) → correctamente no implementado en este plan.

**Nota fuera del spec original pero necesaria:** el spec asumía que el checkbox `es_fijo` "ya existe" en `OutcomeForm` — no existía. Task 11 lo agrega desde cero, junto con la selección de fijo existente pa' poblar `grupo_recurrencia` correctamente (sin esto, el checklist de Task 5 nunca podría agrupar instancias del mismo fijo mes a mes).

**Placeholders:** ninguno — cada step tiene código completo y ejecutable.

**Consistencia de tipos:** `formData.es_fijo`/`dia_esperado`/`grupo_recurrencia` (Task 11) coinciden con lo que `useOutcomes.addOutcome`/`updateOutcome` leen (Task 11 Step 2) y con el shape que `getFixedExpenseTemplates`/`computeFixedExpensesStatus` esperan (Task 5). `preferencias.categoria_baldes`/`porcentajes_balde` (Task 8) coinciden con los parámetros de `computeBudgetSplit` (Task 6) y `useBudgetSplit` (Task 9). `savings` shape (Task 10, DB directo) coincide con lo que `AhorroList`/`AhorroForm` (Task 14) y `generarConsejos` (Task 7, como `metasAhorro`) esperan.
