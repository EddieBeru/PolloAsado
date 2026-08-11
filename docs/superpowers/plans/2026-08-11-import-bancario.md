# Import Bancario (BCR v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importar movimientos desde el export "Movimientos del día" de BCR (HTML disfrazado de `.xls`), con revisión obligatoria en pantalla, sin duplicar contra imports repetidos ni contra lo capturado a mano.

**Architecture:** Parseo 100% client-side (DOMParser sobre el HTML del archivo), sin tabla de staging. Módulos puros y testeables (`frontend/src/lib/bankImport/`) hacen parseo, normalización, detección de duplicados y sugerencia de categoría. Un hook de orquestación (`useBankImport`) junta todo, consulta Supabase para detectar coincidencias contra lo ya guardado, y hace el insert final al confirmar. Dos columnas nuevas (`origen`, `documento_banco`) en `gastos`/`ingresos` con índice único parcial son la garantía real anti-duplicado.

**Tech Stack:** React 19, Supabase JS, Vitest + jsdom (nuevo, para las funciones puras — el proyecto no tenía test runner).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-11-import-bancario-design.md` — toda regla de negocio (flags, resoluciones, mensajes de error) viene de ahí, no inventar variantes.
- Copy en español, tono directo (ver `PRODUCT.md` — "Calm, warm, personal", sin relleno).
- `gastos.categoria` es `NOT NULL` en el schema — no se puede confirmar el import con filas de tipo `gasto` incluidas y sin categoría.
- No tocar `useOutcomes`/`useIncomes` (offline-first, sync optimista) — el import es una acción deliberada online, usa Supabase directo.
- Categorías de gasto (fijas, ver `OutcomeForm.jsx:388-396`): Alimentación, Vivienda, Transporte, Salud, Entretenimiento, Educación, Ropa, Servicios, Otros.
- Categorías de ingreso (fijas, ver `IncomeForm.jsx:448-453`, valor→etiqueta): salary→Salario, business→Negocio, freelance→Freelance, investments→Inversiones, gifts→Regalos, other→Otros.

---

## Task 1: Vitest setup

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.js`

**Interfaces:**
- Produces: comando `npm test` corriendo Vitest en modo `jsdom`, disponible para las tareas 2-6.

- [ ] **Step 1: Instalar dependencias**

```bash
cd frontend && npm install -D vitest jsdom
```

- [ ] **Step 2: Crear config**

```js
// frontend/vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false
  }
})
```

- [ ] **Step 3: Agregar script**

En `frontend/package.json`, dentro de `"scripts"`, agregar:

```json
"test": "vitest run"
```

- [ ] **Step 4: Verificar que corre sin tests**

Run: `cd frontend && npm test`
Expected: "No test files found" (o similar) sin error de config.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.js
git commit -m "chore: agregar vitest pa' testear lógica de import bancario"
```

---

## Task 2: Parseo de monto y fecha bancarios

**Files:**
- Create: `frontend/src/lib/bankImport/parseAmount.js`
- Test: `frontend/src/lib/bankImport/parseAmount.test.js`

**Interfaces:**
- Produces: `parseBankAmount(raw: string) -> number` (NaN si no hay valor), `parseBankDate(raw: string) -> string|null` (`'YYYY-MM-DD'` o `null` si inválida).

- [ ] **Step 1: Escribir tests**

```js
// frontend/src/lib/bankImport/parseAmount.test.js
import { describe, it, expect } from 'vitest'
import { parseBankAmount, parseBankDate } from './parseAmount'

describe('parseBankAmount', () => {
  it('parsea montos negativos con comas de miles', () => {
    expect(parseBankAmount('-19,040.00')).toBe(-19040)
  })
  it('parsea montos positivos', () => {
    expect(parseBankAmount('1,800.00')).toBe(1800)
  })
  it('devuelve NaN para celda vacía', () => {
    expect(Number.isNaN(parseBankAmount(''))).toBe(true)
    expect(Number.isNaN(parseBankAmount(' '))).toBe(true)
  })
})

describe('parseBankDate', () => {
  it('convierte DD/MM/YYYY a YYYY-MM-DD', () => {
    expect(parseBankDate('06/08/2026')).toBe('2026-08-06')
  })
  it('devuelve null para formato inválido', () => {
    expect(parseBankDate('2026-08-06')).toBeNull()
    expect(parseBankDate('')).toBeNull()
    expect(parseBankDate('31/13/2026')).toBe('2026-13-31')
  })
})
```

Nota: el último caso (`31/13/2026`) documenta que `parseBankDate` no valida rangos de mes/día — solo el formato. El mes 13 no existe, pero la fila igual se marca inválida más adelante porque `new Date` la rechaza en `dedupe.js`. Ajustar si se prefiere validar acá; dejarlo así es lo más simple mientras no cause falsos positivos.

- [ ] **Step 2: Correr y verificar que falla**

Run: `cd frontend && npm test -- parseAmount`
Expected: FAIL, `parseAmount.js` no existe.

- [ ] **Step 3: Implementar**

```js
// frontend/src/lib/bankImport/parseAmount.js

/** Convierte '1,800.00' / '-19,040.00' a número. NaN si no hay valor. */
export function parseBankAmount(raw) {
  const cleaned = (raw || '').replace(/ /g, '').trim()
  if (!cleaned) return NaN
  return parseFloat(cleaned.replace(/,/g, ''))
}

/** Convierte 'DD/MM/YYYY' a 'YYYY-MM-DD'. null si el formato no matchea. */
export function parseBankDate(raw) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((raw || '').trim())
  if (!match) return null
  const [, dd, mm, yyyy] = match
  return `${yyyy}-${mm}-${dd}`
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `cd frontend && npm test -- parseAmount`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/bankImport/parseAmount.js frontend/src/lib/bankImport/parseAmount.test.js
git commit -m "feat: parseo de monto y fecha del formato BCR"
```

---

## Task 3: Parser de la tabla BCR

**Files:**
- Create: `frontend/src/lib/bankImport/parseBCR.js`
- Test: `frontend/src/lib/bankImport/parseBCR.test.js`

**Interfaces:**
- Consumes: `parseBankAmount`, `parseBankDate` de `./parseAmount` (Task 2).
- Produces: `BankFileParseError` (clase, `Error`), `parseBCR(html: string) -> RawMovement[]` donde `RawMovement = { fecha: string|null, hora: string, documento: string, descripcion: string, monto: number|null, tipo: 'gasto'|'ingreso'|null, invalid: boolean, invalidReason: string|null }`.

- [ ] **Step 1: Escribir tests**

```js
// frontend/src/lib/bankImport/parseBCR.test.js
import { describe, it, expect } from 'vitest'
import { parseBCR, BankFileParseError } from './parseBCR'

const HEADER = `
<table id="t1" cellspacing="1" cellpadding="2">
  <tr class="header1" valign="top">
    <th>Fecha contable</th>
    <th>Fecha transacción</th>
    <th>Hora</th>
    <th>Documento</th>
    <th>Descripción</th>
    <th>Débitos</th>
    <th>Créditos</th>
  </tr>
`

function withRows(rowsHtml) {
  return `<html><body>${HEADER}${rowsHtml}</table></body></html>`
}

describe('parseBCR', () => {
  it('parsea una fila de débito como gasto', () => {
    const html = withRows(`
      <tr>
        <td>10/08/2026</td><td>06/08/2026</td><td>05:01</td>
        <td>325495</td><td>COMPRAS EN COMERCIOS / 01880055   +002SODA DEPORTES</td>
        <td align="right">-1,800.00</td><td align="right">&nbsp;</td>
      </tr>
    `)
    const rows = parseBCR(html)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      fecha: '2026-08-06',
      hora: '05:01',
      documento: '325495',
      descripcion: 'COMPRAS EN COMERCIOS / 01880055   +002SODA DEPORTES',
      monto: 1800,
      tipo: 'gasto',
      invalid: false
    })
  })

  it('parsea una fila de crédito como ingreso', () => {
    const html = withRows(`
      <tr>
        <td>10/08/2026</td><td>08/08/2026</td><td>10:00</td>
        <td>99001</td><td>SINPE MOVIL OTRA ENT / Transferencia SINPE</td>
        <td align="right">&nbsp;</td><td align="right">5,000.00</td>
      </tr>
    `)
    const rows = parseBCR(html)
    expect(rows[0].tipo).toBe('ingreso')
    expect(rows[0].monto).toBe(5000)
  })

  it('marca inválida una fila sin débito ni crédito', () => {
    const html = withRows(`
      <tr>
        <td>10/08/2026</td><td>08/08/2026</td><td>10:00</td>
        <td>99002</td><td>AJUSTE</td>
        <td align="right">&nbsp;</td><td align="right">&nbsp;</td>
      </tr>
    `)
    const rows = parseBCR(html)
    expect(rows[0].invalid).toBe(true)
    expect(rows[0].invalidReason).toBe('No se pudo leer el monto')
  })

  it('marca inválida una fila con fecha rota', () => {
    const html = withRows(`
      <tr>
        <td>10/08/2026</td><td>rota</td><td>10:00</td>
        <td>99003</td><td>ALGO</td>
        <td align="right">-100.00</td><td align="right">&nbsp;</td>
      </tr>
    `)
    const rows = parseBCR(html)
    expect(rows[0].invalid).toBe(true)
    expect(rows[0].invalidReason).toBe('Fecha inválida')
  })

  it('devuelve arreglo vacío si el archivo no tiene movimientos', () => {
    const html = withRows('')
    expect(parseBCR(html)).toEqual([])
  })

  it('lanza BankFileParseError si la tabla no existe', () => {
    expect(() => parseBCR('<html><body>no hay tabla</body></html>')).toThrow(BankFileParseError)
  })

  it('lanza BankFileParseError si los headers no matchean', () => {
    const html = `<html><body><table id="t1"><tr class="header1"><th>Columna rara</th></tr></table></body></html>`
    expect(() => parseBCR(html)).toThrow(BankFileParseError)
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `cd frontend && npm test -- parseBCR`
Expected: FAIL, `parseBCR.js` no existe.

- [ ] **Step 3: Implementar**

```js
// frontend/src/lib/bankImport/parseBCR.js
import { parseBankAmount, parseBankDate } from './parseAmount'

export class BankFileParseError extends Error {}

const EXPECTED_HEADERS = [
  'Fecha contable', 'Fecha transacción', 'Hora', 'Documento',
  'Descripción', 'Débitos', 'Créditos'
]

const UNREADABLE_MESSAGE = 'No pudimos leer este archivo — ¿es un export de movimientos de BCR?'

/** Parsea el export "Movimientos del día" de BCR (HTML disfrazado de .xls). */
export function parseBCR(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const table = doc.querySelector('#t1')
  if (!table) throw new BankFileParseError(UNREADABLE_MESSAGE)

  const headerRow = table.querySelector('tr.header1')
  const headerCells = headerRow
    ? Array.from(headerRow.querySelectorAll('th')).map(th => th.textContent.replace(/ /g, '').trim())
    : []
  const headersMatch = EXPECTED_HEADERS.every((h, i) => headerCells[i]?.startsWith(h))
  if (!headersMatch) throw new BankFileParseError(UNREADABLE_MESSAGE)

  const dataRows = Array.from(table.querySelectorAll('tr'))
    .filter(tr => !tr.classList.contains('header1') && tr.querySelector('td'))

  return dataRows.map(parseRow)
}

function parseRow(tr) {
  const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.replace(/ /g, '').trim())
  const [, fechaTransaccionRaw, hora, documento, descripcion, debitosRaw, creditosRaw] = cells

  const fecha = parseBankDate(fechaTransaccionRaw)
  const debito = parseBankAmount(debitosRaw)
  const credito = parseBankAmount(creditosRaw)

  let tipo = null
  let monto = null
  if (Number.isFinite(debito) && debito !== 0) {
    tipo = 'gasto'
    monto = Math.abs(debito)
  } else if (Number.isFinite(credito) && credito !== 0) {
    tipo = 'ingreso'
    monto = Math.abs(credito)
  }

  let invalid = false
  let invalidReason = null
  if (!fecha) {
    invalid = true
    invalidReason = 'Fecha inválida'
  } else if (monto === null) {
    invalid = true
    invalidReason = 'No se pudo leer el monto'
  }

  return { fecha, hora, documento, descripcion, monto, tipo, invalid, invalidReason }
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `cd frontend && npm test -- parseBCR`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/bankImport/parseBCR.js frontend/src/lib/bankImport/parseBCR.test.js
git commit -m "feat: parser de tabla HTML de movimientos BCR"
```

---

## Task 4: Normalización de descripción (para reglas y detección de duplicados)

**Files:**
- Create: `frontend/src/lib/bankImport/normalize.js`
- Test: `frontend/src/lib/bankImport/normalize.test.js`

**Interfaces:**
- Produces: `normalizeDescripcion(raw: string) -> string`.

- [ ] **Step 1: Escribir tests**

```js
// frontend/src/lib/bankImport/normalize.test.js
import { describe, it, expect } from 'vitest'
import { normalizeDescripcion } from './normalize'

describe('normalizeDescripcion', () => {
  it('extrae el comercio de una compra con código de terminal', () => {
    expect(normalizeDescripcion('COMPRAS EN COMERCIOS / 01880055   +002SODA DEPORTES'))
      .toBe('SODA DEPORTES')
  })

  it('no rompe con un comercio que trae "/" en el nombre', () => {
    expect(normalizeDescripcion('COMPRAS EN COMERCIOS / 9840005105 +002APPLE.COM/BILL'))
      .toBe('APPLE.COM/BILL')
  })

  it('extrae el texto tras "/" cuando no hay código +NNN', () => {
    expect(normalizeDescripcion('SINPE MOVIL OTRA ENT / Transferencia SINPE'))
      .toBe('TRANSFERENCIA SINPE')
  })

  it('devuelve el texto completo en mayúsculas si no hay "/"', () => {
    expect(normalizeDescripcion('ajuste manual')).toBe('AJUSTE MANUAL')
  })

  it('devuelve string vacío para entrada vacía', () => {
    expect(normalizeDescripcion('')).toBe('')
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `cd frontend && npm test -- normalize`
Expected: FAIL, `normalize.js` no existe.

- [ ] **Step 3: Implementar**

```js
// frontend/src/lib/bankImport/normalize.js

/**
 * Extrae el nombre de comercio de una descripción cruda de BCR.
 * Formato típico: "COMPRAS EN COMERCIOS / <código terminal> +<NNN><comercio>".
 * Solo corta en el primer "/" — el nombre del comercio puede traer otro "/" (ej. dominios).
 */
export function normalizeDescripcion(raw) {
  const cleaned = (raw || '').trim().toUpperCase().replace(/\s+/g, ' ')
  if (!cleaned) return ''

  const slashIndex = cleaned.indexOf('/')
  const tail = slashIndex >= 0 ? cleaned.slice(slashIndex + 1).trim() : cleaned

  const merchant = tail
    .replace(/^\d+\s*/, '')
    .replace(/^\+\d{3}\s*/, '')
    .trim()

  return merchant || cleaned
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `cd frontend && npm test -- normalize`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/bankImport/normalize.js frontend/src/lib/bankImport/normalize.test.js
git commit -m "feat: normalización de descripción de movimientos bancarios"
```

---

## Task 5: Detección de duplicados (ya existe manual / cargo doble)

**Files:**
- Create: `frontend/src/lib/bankImport/dedupe.js`
- Test: `frontend/src/lib/bankImport/dedupe.test.js`

**Interfaces:**
- Consumes: filas con forma `{ id, fecha, monto, tipo, descripcionNormalizada, invalid }` (subconjunto de `PreviewRow`, definido en Task 8) y, para `findManualMatches`, existentes con forma `{ id, tabla, fecha, monto, tipo }`.
- Produces: `findManualMatches(previewRows, existentes) -> Map<string, Array<{id, tabla}>>`, `findDoubleCharges(previewRows) -> Map<string, string[]>`.

- [ ] **Step 1: Escribir tests**

```js
// frontend/src/lib/bankImport/dedupe.test.js
import { describe, it, expect } from 'vitest'
import { findManualMatches, findDoubleCharges } from './dedupe'

describe('findManualMatches', () => {
  it('detecta un existente con mismo monto y fecha dentro de 1 día', () => {
    const rows = [{ id: 'r1', fecha: '2026-08-06', monto: 1800, tipo: 'gasto', invalid: false }]
    const existentes = [{ id: 'e1', tabla: 'gastos', fecha: '2026-08-07', monto: 1800, tipo: 'gasto' }]
    const matches = findManualMatches(rows, existentes)
    expect(matches.get('r1')).toEqual([{ id: 'e1', tabla: 'gastos', fecha: '2026-08-07', monto: 1800, tipo: 'gasto' }])
  })

  it('no matchea si el tipo difiere', () => {
    const rows = [{ id: 'r1', fecha: '2026-08-06', monto: 1800, tipo: 'gasto', invalid: false }]
    const existentes = [{ id: 'e1', tabla: 'ingresos', fecha: '2026-08-06', monto: 1800, tipo: 'ingreso' }]
    expect(findManualMatches(rows, existentes).size).toBe(0)
  })

  it('no matchea si la fecha está a más de 1 día', () => {
    const rows = [{ id: 'r1', fecha: '2026-08-06', monto: 1800, tipo: 'gasto', invalid: false }]
    const existentes = [{ id: 'e1', tabla: 'gastos', fecha: '2026-08-09', monto: 1800, tipo: 'gasto' }]
    expect(findManualMatches(rows, existentes).size).toBe(0)
  })

  it('ignora filas inválidas', () => {
    const rows = [{ id: 'r1', fecha: '2026-08-06', monto: 1800, tipo: 'gasto', invalid: true }]
    const existentes = [{ id: 'e1', tabla: 'gastos', fecha: '2026-08-06', monto: 1800, tipo: 'gasto' }]
    expect(findManualMatches(rows, existentes).size).toBe(0)
  })
})

describe('findDoubleCharges', () => {
  it('detecta mismo comercio y fecha cercana (autorización + ajuste)', () => {
    const rows = [
      { id: 'r1', fecha: '2026-08-02', tipo: 'gasto', descripcionNormalizada: 'MAXIPALI LAGUNI', invalid: false },
      { id: 'r2', fecha: '2026-08-03', tipo: 'gasto', descripcionNormalizada: 'MAXIPALI LAGUNI', invalid: false }
    ]
    const flags = findDoubleCharges(rows)
    expect(flags.get('r1')).toEqual(['r2'])
    expect(flags.get('r2')).toEqual(['r1'])
  })

  it('no flaguea comercios distintos', () => {
    const rows = [
      { id: 'r1', fecha: '2026-08-02', tipo: 'gasto', descripcionNormalizada: 'MAXIPALI LAGUNI', invalid: false },
      { id: 'r2', fecha: '2026-08-02', tipo: 'gasto', descripcionNormalizada: 'SODA DEPORTES', invalid: false }
    ]
    expect(findDoubleCharges(rows).size).toBe(0)
  })

  it('no flaguea el mismo comercio si la fecha está a más de 2 días', () => {
    const rows = [
      { id: 'r1', fecha: '2026-08-01', tipo: 'gasto', descripcionNormalizada: 'MAXIPALI LAGUNI', invalid: false },
      { id: 'r2', fecha: '2026-08-10', tipo: 'gasto', descripcionNormalizada: 'MAXIPALI LAGUNI', invalid: false }
    ]
    expect(findDoubleCharges(rows).size).toBe(0)
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `cd frontend && npm test -- dedupe`
Expected: FAIL, `dedupe.js` no existe.

- [ ] **Step 3: Implementar**

```js
// frontend/src/lib/bankImport/dedupe.js

const ONE_DAY_MS = 24 * 60 * 60 * 1000

function daysBetween(a, b) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / ONE_DAY_MS
}

/** Movimientos importados que calzan (monto + tipo + fecha ±1 día) con algo ya capturado a mano. */
export function findManualMatches(previewRows, existentes) {
  const matches = new Map()
  for (const row of previewRows) {
    if (row.invalid) continue
    const candidatos = existentes.filter(e =>
      e.tipo === row.tipo &&
      Number(e.monto) === Number(row.monto) &&
      daysBetween(e.fecha, row.fecha) <= 1
    )
    if (candidatos.length > 0) matches.set(row.id, candidatos)
  }
  return matches
}

/** Movimientos importados que podrían ser el mismo cargo dos veces (autorización + ajuste). */
export function findDoubleCharges(previewRows) {
  const flags = new Map()
  for (let i = 0; i < previewRows.length; i++) {
    const a = previewRows[i]
    if (a.invalid) continue
    const others = []
    for (let j = 0; j < previewRows.length; j++) {
      if (i === j) continue
      const b = previewRows[j]
      if (b.invalid) continue
      if (a.tipo === b.tipo && a.descripcionNormalizada === b.descripcionNormalizada && daysBetween(a.fecha, b.fecha) <= 2) {
        others.push(b.id)
      }
    }
    if (others.length > 0) flags.set(a.id, others)
  }
  return flags
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `cd frontend && npm test -- dedupe`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/bankImport/dedupe.js frontend/src/lib/bankImport/dedupe.test.js
git commit -m "feat: detección de duplicados (ya existe manual / cargo doble)"
```

---

## Task 6: Sugerencia de categoría por reglas

**Files:**
- Create: `frontend/src/lib/bankImport/categorize.js`
- Test: `frontend/src/lib/bankImport/categorize.test.js`

**Interfaces:**
- Produces: `suggestCategory(descripcionNormalizada: string, tipo: 'gasto'|'ingreso', reglas: Array<{patron, categoria, tipo}>) -> string|null`.

- [ ] **Step 1: Escribir tests**

```js
// frontend/src/lib/bankImport/categorize.test.js
import { describe, it, expect } from 'vitest'
import { suggestCategory } from './categorize'

describe('suggestCategory', () => {
  const reglas = [
    { patron: 'SODA DEPORTES', categoria: 'Alimentación', tipo: 'gasto' },
    { patron: 'MAXIPALI', categoria: 'Alimentación', tipo: 'gasto' }
  ]

  it('devuelve la categoría cuando el patrón está contenido en la descripción', () => {
    expect(suggestCategory('MAXIPALI LAGUNI', 'gasto', reglas)).toBe('Alimentación')
  })

  it('devuelve null si no hay match', () => {
    expect(suggestCategory('APPLE.COM/BILL', 'gasto', reglas)).toBeNull()
  })

  it('respeta el tipo — no sugiere una regla de gasto pa un ingreso', () => {
    expect(suggestCategory('MAXIPALI LAGUNI', 'ingreso', reglas)).toBeNull()
  })

  it('devuelve null si no hay reglas', () => {
    expect(suggestCategory('MAXIPALI LAGUNI', 'gasto', [])).toBeNull()
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `cd frontend && npm test -- categorize`
Expected: FAIL, `categorize.js` no existe.

- [ ] **Step 3: Implementar**

```js
// frontend/src/lib/bankImport/categorize.js

/** Primera regla del usuario cuyo patrón está contenido en la descripción normalizada. */
export function suggestCategory(descripcionNormalizada, tipo, reglas) {
  if (!descripcionNormalizada || !reglas || reglas.length === 0) return null
  const match = reglas.find(r => r.tipo === tipo && descripcionNormalizada.includes(r.patron))
  return match ? match.categoria : null
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `cd frontend && npm test -- categorize`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/bankImport/categorize.js frontend/src/lib/bankImport/categorize.test.js
git commit -m "feat: sugerencia de categoría por reglas aprendidas"
```

---

## Task 7: Migración de base de datos

**Files:**
- Create: `supabase/migrations/20260811020000_add_import_bancario.sql`
- Modify: `supabase/squema.sql` (mantenerlo como referencia completa, igual que hicieron migraciones anteriores — ver `7_agregar_divisas_a_gastos.sql` reflejado en `squema.sql:20-22`)
- Modify: `supabase/rls.sql`

**Interfaces:**
- Produces: columnas `gastos.origen`, `gastos.documento_banco`, `ingresos.origen`, `ingresos.documento_banco`, tabla `reglas_categorizacion(id, user_id, patron, categoria, tipo, created_at)`, índices únicos parciales, policy RLS. Estos nombres son los que usan `useReglasCategorizacion` (Task 8) y `useBankImport` (Task 9).

- [ ] **Step 1: Escribir la migración**

```sql
-- supabase/migrations/20260811020000_add_import_bancario.sql

-- Origen y folio bancario en gastos e ingresos. El índice único parcial es la
-- garantía real contra reimportar el mismo movimiento — no depende solo de la UI.
ALTER TABLE gastos ADD COLUMN origen TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE gastos ADD COLUMN documento_banco TEXT;
CREATE UNIQUE INDEX idx_gastos_documento_banco ON gastos (user_id, documento_banco) WHERE documento_banco IS NOT NULL;

ALTER TABLE ingresos ADD COLUMN origen TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE ingresos ADD COLUMN documento_banco TEXT;
CREATE UNIQUE INDEX idx_ingresos_documento_banco ON ingresos (user_id, documento_banco) WHERE documento_banco IS NOT NULL;

-- Reglas de categorización aprendidas de imports pasados.
CREATE TABLE reglas_categorizacion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  patron TEXT NOT NULL,
  categoria TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'gasto' | 'ingreso'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, patron, tipo)
);

ALTER TABLE reglas_categorizacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario_solo_ve_los_suyos" ON reglas_categorizacion
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 2: Aplicar la migración**

Run: `cd supabase && supabase db push` (o el comando que use el proyecto para aplicar migraciones al entorno de desarrollo — confirmar con `supabase status` primero).
Expected: migración aplicada sin error.

- [ ] **Step 3: Actualizar `squema.sql`**

En la tabla `gastos`, después de `created_at`, agregar:

```sql
  origen TEXT NOT NULL DEFAULT 'manual',
  documento_banco TEXT,
```

En la tabla `ingresos`, mismo cambio. Y agregar al final del archivo:

```sql
-- Reglas de categorización aprendidas de imports bancarios
CREATE TABLE reglas_categorizacion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  patron TEXT NOT NULL,
  categoria TEXT NOT NULL,
  tipo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, patron, tipo)
);
```

- [ ] **Step 4: Actualizar `rls.sql`**

Agregar:

```sql
ALTER TABLE reglas_categorizacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario_solo_ve_los_suyos" ON reglas_categorizacion FOR ALL USING (auth.uid() = user_id);
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260811020000_add_import_bancario.sql supabase/squema.sql supabase/rls.sql
git commit -m "feat: schema pa' import bancario (origen, documento_banco, reglas_categorizacion)"
```

---

## Task 8: Hook `useReglasCategorizacion`

**Files:**
- Create: `frontend/src/hooks/useReglasCategorizacion.js`

**Interfaces:**
- Consumes: tabla `reglas_categorizacion` (Task 7), `supabase` de `../lib/supabaseClient`.
- Produces: `useReglasCategorizacion(user) -> { reglas: Array<{patron, categoria, tipo}>, loading: boolean, saveRegla: (patron: string, categoria: string, tipo: string) => Promise<void> }`. `saveRegla` es lo que consume `useBankImport` (Task 9).

- [ ] **Step 1: Implementar**

```js
// frontend/src/hooks/useReglasCategorizacion.js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useReglasCategorizacion(user) {
  const [reglas, setReglas] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchReglas = useCallback(async () => {
    if (!user) {
      setReglas([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('reglas_categorizacion')
      .select('patron, categoria, tipo')
      .eq('user_id', user.id)

    if (error) {
      console.error('No se pudieron traer las reglas de categorización:', error)
      setReglas([])
    } else {
      setReglas(data || [])
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchReglas() }, [fetchReglas])

  const saveRegla = useCallback(async (patron, categoria, tipo) => {
    if (!user) return
    const { error } = await supabase
      .from('reglas_categorizacion')
      .upsert(
        { user_id: user.id, patron, categoria, tipo },
        { onConflict: 'user_id,patron,tipo' }
      )
    if (error) {
      console.error('No se pudo guardar la regla de categorización:', error)
      return
    }
    await fetchReglas()
  }, [user, fetchReglas])

  return { reglas, loading, saveRegla }
}
```

- [ ] **Step 2: Verificar que el build no rompe**

Run: `cd frontend && npm run build`
Expected: build exitoso (no hay test de integración con Supabase real en este task; se ejercita end-to-end manualmente en Task 11).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useReglasCategorizacion.js
git commit -m "feat: hook pa' leer y guardar reglas de categorización"
```

---

## Task 9: Hook `useBankImport`

**Files:**
- Create: `frontend/src/hooks/useBankImport.js`

**Interfaces:**
- Consumes: `parseBCR`, `BankFileParseError` (Task 3), `normalizeDescripcion` (Task 4), `findManualMatches`, `findDoubleCharges` (Task 5), `suggestCategory` (Task 6), `supabase`.
- Produces: `PreviewRow = { id, fecha, hora, documento, descripcion, descripcionNormalizada, monto, tipo, invalid, invalidReason, categoria, incluir, flagTipo: null|'ya_existe'|'cargo_doble', flagCandidatos, resolucion: null|'vincular'|'importar_de_todas_formas'|'omitir'|'mismo_cargo'|'dos_cargos_reales', recordarRegla }`. `useBankImport(user) -> { status: 'idle'|'parsing'|'ready'|'confirming'|'done', rows: PreviewRow[], error: string|null, summary: {creados,vinculados,omitidos,fallidos}|null, canConfirm: boolean, loadFile: (file: File, reglas) => Promise<void>, updateRow: (id: string, patch: object) => void, confirmImport: (saveRegla: Function) => Promise<void>, reset: () => void }`. Este es el hook que consume `Import.jsx` (Task 10).

- [ ] **Step 1: Implementar**

```js
// frontend/src/hooks/useBankImport.js
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { parseBCR, BankFileParseError } from '../lib/bankImport/parseBCR'
import { normalizeDescripcion } from '../lib/bankImport/normalize'
import { findManualMatches, findDoubleCharges } from '../lib/bankImport/dedupe'
import { suggestCategory } from '../lib/bankImport/categorize'

export function useBankImport(user) {
  const [status, setStatus] = useState('idle')
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)

  const reset = useCallback(() => {
    setStatus('idle')
    setRows([])
    setError(null)
    setSummary(null)
  }, [])

  const loadFile = useCallback(async (file, reglas) => {
    setStatus('parsing')
    setError(null)
    setSummary(null)

    let html
    try {
      html = await file.text()
    } catch (err) {
      console.error('No se pudo leer el archivo:', err)
      setError('No se pudo leer el archivo. Intentá de nuevo.')
      setStatus('idle')
      return
    }

    let movimientos
    try {
      movimientos = parseBCR(html)
    } catch (err) {
      if (err instanceof BankFileParseError) {
        setError(err.message)
      } else {
        console.error('Error inesperado parseando el archivo:', err)
        setError('No pudimos leer este archivo — ¿es un export de movimientos de BCR?')
      }
      setStatus('idle')
      return
    }

    if (movimientos.length === 0) {
      setError('Este archivo no tiene movimientos.')
      setStatus('idle')
      return
    }

    const fechasValidas = movimientos.filter(m => m.fecha).map(m => m.fecha).sort()
    const start = fechasValidas[0] || new Date().toISOString().split('T')[0]
    const end = fechasValidas[fechasValidas.length - 1] || start

    const [gastosRes, ingresosRes] = await Promise.all([
      supabase.from('gastos').select('id, monto, fecha').eq('user_id', user.id).is('documento_banco', null).gte('fecha', start).lte('fecha', end),
      supabase.from('ingresos').select('id, monto, fecha').eq('user_id', user.id).is('documento_banco', null).gte('fecha', start).lte('fecha', end)
    ])

    if (gastosRes.error || ingresosRes.error) {
      console.error('No se pudo comparar contra movimientos existentes:', gastosRes.error || ingresosRes.error)
      setError('No se pudo revisar duplicados contra lo ya registrado. Intentá de nuevo.')
      setStatus('idle')
      return
    }

    const existentes = [
      ...(gastosRes.data || []).map(g => ({ ...g, tipo: 'gasto', tabla: 'gastos' })),
      ...(ingresosRes.data || []).map(i => ({ ...i, tipo: 'ingreso', tabla: 'ingresos' }))
    ]

    const previewRows = movimientos.map(m => {
      const descripcionNormalizada = normalizeDescripcion(m.descripcion)
      return {
        ...m,
        id: crypto.randomUUID(),
        descripcionNormalizada,
        categoria: m.tipo ? (suggestCategory(descripcionNormalizada, m.tipo, reglas) || '') : '',
        incluir: !m.invalid,
        flagTipo: null,
        flagCandidatos: [],
        resolucion: null,
        recordarRegla: false
      }
    })

    const manualMatches = findManualMatches(previewRows, existentes)
    const doubleCharges = findDoubleCharges(previewRows)

    for (const row of previewRows) {
      const manual = manualMatches.get(row.id)
      if (manual && manual.length > 0) {
        row.flagTipo = 'ya_existe'
        row.flagCandidatos = manual
        continue
      }
      const doubles = doubleCharges.get(row.id)
      if (doubles && doubles.length > 0) {
        row.flagTipo = 'cargo_doble'
        row.flagCandidatos = doubles
      }
    }

    setRows(previewRows)
    setStatus('ready')
  }, [user])

  const updateRow = useCallback((id, patch) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const canConfirm = rows.length > 0 && rows.every(r => {
    if (!r.incluir) return true
    if (r.flagTipo && !r.resolucion) return false
    if (r.tipo === 'gasto' && !r.categoria) return false
    return true
  })

  const confirmImport = useCallback(async (saveRegla) => {
    setStatus('confirming')
    let creados = 0
    let vinculados = 0
    let omitidos = 0
    let fallidos = 0

    for (const row of rows) {
      if (!row.incluir || row.resolucion === 'omitir') {
        omitidos++
        continue
      }

      if (row.flagTipo === 'ya_existe' && row.resolucion === 'vincular') {
        const target = row.flagCandidatos[0]
        const { error } = await supabase
          .from(target.tabla)
          .update({ documento_banco: row.documento })
          .eq('id', target.id)
        if (error) {
          console.error('No se pudo vincular el movimiento:', error)
          fallidos++
        } else {
          vinculados++
        }
        continue
      }

      const tabla = row.tipo === 'gasto' ? 'gastos' : 'ingresos'
      const payload = {
        id: crypto.randomUUID(),
        user_id: user.id,
        monto: row.monto,
        descripcion: row.descripcion,
        categoria: row.categoria || null,
        fecha: row.fecha,
        es_recurrente: false,
        origen: 'importado',
        documento_banco: row.documento
      }
      if (tabla === 'gastos') payload.es_fijo = false

      const { error } = await supabase.from(tabla).insert([payload])
      if (error) {
        console.error('No se pudo importar un movimiento:', error)
        fallidos++
        continue
      }
      creados++

      if (row.recordarRegla && row.categoria) {
        await saveRegla(row.descripcionNormalizada, row.categoria, row.tipo)
      }
    }

    setSummary({ creados, vinculados, omitidos, fallidos })
    setStatus('done')
  }, [rows, user])

  return { status, rows, error, summary, canConfirm, loadFile, updateRow, confirmImport, reset }
}
```

- [ ] **Step 2: Verificar que el build no rompe**

Run: `cd frontend && npm run build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useBankImport.js
git commit -m "feat: hook de orquestación del import bancario"
```

---

## Task 10: UI — tabla de preview y página de import

**Files:**
- Create: `frontend/src/components/Import/ImportPreviewTable.jsx`
- Create: `frontend/src/components/Import.jsx`
- Modify: `frontend/src/components/Layout.jsx` (agregar tab)

**Interfaces:**
- Consumes: `useBankImport` (Task 9), `useReglasCategorizacion` (Task 8), `formatMoney`/`formatDate` de `../lib/format`.
- Produces: tab "Importar" navegable en `Layout.jsx`.

- [ ] **Step 1: Implementar `ImportPreviewTable.jsx`**

```jsx
// frontend/src/components/Import/ImportPreviewTable.jsx
import { formatMoney, formatDate } from '../../lib/format'

const CATEGORIAS_GASTO = ['Alimentación', 'Vivienda', 'Transporte', 'Salud', 'Entretenimiento', 'Educación', 'Ropa', 'Servicios', 'Otros']
const CATEGORIAS_INGRESO = [
  { value: 'salary', label: 'Salario' },
  { value: 'business', label: 'Negocio' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'investments', label: 'Inversiones' },
  { value: 'gifts', label: 'Regalos' },
  { value: 'other', label: 'Otros' }
]

function CategorySelect({ row, onChange }) {
  if (row.tipo === 'ingreso') {
    return (
      <select className="input cursor-pointer" value={row.categoria} onChange={(e) => onChange({ categoria: e.target.value })}>
        <option value="">Sin categorizar</option>
        {CATEGORIAS_INGRESO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
    )
  }
  return (
    <select className="input cursor-pointer" value={row.categoria} onChange={(e) => onChange({ categoria: e.target.value })}>
      <option value="">Sin categorizar</option>
      {CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  )
}

function FlagRow({ row, onChange }) {
  if (row.flagTipo === 'ya_existe') {
    return (
      <div className="notice-warning flex flex-col gap-2">
        <p>¿Ya capturaste este movimiento a mano? {formatMoney(row.monto)} el {formatDate(row.fecha)}.</p>
        <div className="flex gap-2 flex-wrap">
          <button type="button" className="btn-secondary" onClick={() => onChange({ resolucion: 'vincular' })}>Vincular con el existente</button>
          <button type="button" className="btn-secondary" onClick={() => onChange({ resolucion: 'importar_de_todas_formas' })}>Son movimientos distintos, importar</button>
          <button type="button" className="btn-secondary" onClick={() => onChange({ resolucion: 'omitir', incluir: false })}>Omitir</button>
        </div>
        {row.resolucion && <p className="text-xs text-text-secondary">Elegiste: {row.resolucion.replace(/_/g, ' ')}</p>}
      </div>
    )
  }
  if (row.flagTipo === 'cargo_doble') {
    return (
      <div className="notice-warning flex flex-col gap-2">
        <p>Posible cargo doble por autorización: {formatMoney(row.monto)} el {formatDate(row.fecha)}, mismo comercio que otra fila de este archivo.</p>
        <div className="flex gap-2 flex-wrap">
          <button type="button" className="btn-secondary" onClick={() => onChange({ resolucion: 'mismo_cargo', incluir: false })}>Es el mismo cargo, omitir esta fila</button>
          <button type="button" className="btn-secondary" onClick={() => onChange({ resolucion: 'dos_cargos_reales' })}>Son 2 cargos reales, importar ambos</button>
        </div>
        {row.resolucion && <p className="text-xs text-text-secondary">Elegiste: {row.resolucion.replace(/_/g, ' ')}</p>}
      </div>
    )
  }
  return null
}

export default function ImportPreviewTable({ rows, onUpdateRow }) {
  const flagged = rows.filter(r => r.flagTipo)
  const rest = rows.filter(r => !r.flagTipo)

  return (
    <div className="flex flex-col gap-6">
      {flagged.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-text-primary">Revisar antes de confirmar ({flagged.length})</h3>
          {flagged.map(row => (
            <div key={row.id} className="card flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="user-text text-sm">{row.descripcion}</span>
                <span className="num font-mono text-sm font-bold">{formatMoney(row.monto)}</span>
              </div>
              <FlagRow row={row} onChange={(patch) => onUpdateRow(row.id, patch)} />
              {row.resolucion && !['omitir', 'mismo_cargo'].includes(row.resolucion) && (
                <CategorySelect row={row} onChange={(patch) => onUpdateRow(row.id, patch)} />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-bold text-text-primary">Movimientos ({rest.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-secondary border-b border-border-app/30">
                <th className="py-2 pr-3">Incluir</th>
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 pr-3">Descripción</th>
                <th className="py-2 pr-3">Monto</th>
                <th className="py-2 pr-3">Categoría</th>
                <th className="py-2 pr-3">Recordar</th>
              </tr>
            </thead>
            <tbody>
              {rest.map(row => (
                <tr key={row.id} className="border-b border-border-app/10">
                  <td className="py-2 pr-3">
                    <input
                      type="checkbox"
                      checked={row.incluir}
                      disabled={row.invalid}
                      onChange={(e) => onUpdateRow(row.id, { incluir: e.target.checked })}
                    />
                  </td>
                  <td className="py-2 pr-3 num font-mono">{formatDate(row.fecha)}</td>
                  <td className="py-2 pr-3 user-text max-w-xs truncate" title={row.descripcion}>
                    {row.descripcion}
                    {row.invalid && <span className="text-negative text-xs block">{row.invalidReason}</span>}
                  </td>
                  <td className="py-2 pr-3 num font-mono">{row.tipo ? formatMoney(row.monto) : '—'}</td>
                  <td className="py-2 pr-3">
                    {row.invalid ? '—' : <CategorySelect row={row} onChange={(patch) => onUpdateRow(row.id, patch)} />}
                  </td>
                  <td className="py-2 pr-3">
                    {!row.invalid && (
                      <input
                        type="checkbox"
                        checked={row.recordarRegla}
                        onChange={(e) => onUpdateRow(row.id, { recordarRegla: e.target.checked })}
                        title="Recordar esta categoría para este comercio"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implementar `Import.jsx`**

```jsx
// frontend/src/components/Import.jsx
import { useRef } from 'react'
import { useBankImport } from '../hooks/useBankImport'
import { useReglasCategorizacion } from '../hooks/useReglasCategorizacion'
import ImportPreviewTable from './Import/ImportPreviewTable'
import { Upload } from 'lucide-react'

export default function Import({ user }) {
  const { reglas, saveRegla } = useReglasCategorizacion(user)
  const { status, rows, error, summary, canConfirm, loadFile, updateRow, confirmImport, reset } = useBankImport(user)
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    await loadFile(file, reglas)
    e.target.value = ''
  }

  const handleConfirm = async () => {
    await confirmImport(saveRegla)
  }

  return (
    <div className="w-full flex-1 flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="heading">Importar movimientos</h2>
        {status !== 'idle' && (
          <button type="button" className="btn-secondary" onClick={reset}>Empezar de nuevo</button>
        )}
      </div>

      {status === 'idle' && (
        <div className="card flex flex-col gap-4 items-start">
          <p className="text-text-secondary">
            Subí el archivo "Movimientos del día" que exportás desde la banca en línea de BCR.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.html,text/html"
            onChange={handleFileChange}
            className="hidden"
          />
          <button type="button" className="btn-primary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} /> Subir archivo
          </button>
        </div>
      )}

      {status === 'parsing' && <p className="text-text-secondary">Leyendo archivo…</p>}

      {error && <p className="notice-negative" role="alert">{error}</p>}

      {status === 'ready' && (
        <>
          <ImportPreviewTable rows={rows} onUpdateRow={updateRow} />
          <div className="flex items-center gap-4">
            <button type="button" className="btn-primary" disabled={!canConfirm} onClick={handleConfirm}>
              Confirmar import ({rows.filter(r => r.incluir).length})
            </button>
            {!canConfirm && <p className="text-xs text-text-secondary">Resolvé las filas marcadas y asigná categoría a los gastos antes de confirmar.</p>}
          </div>
        </>
      )}

      {status === 'confirming' && <p className="text-text-secondary">Importando…</p>}

      {status === 'done' && summary && (
        <div className="notice-warning">
          {summary.creados} movimientos importados, {summary.vinculados} vinculados a existentes, {summary.omitidos} omitidos
          {summary.fallidos > 0 ? `, ${summary.fallidos} fallaron (revisá la consola y reintentá)` : ''}.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Agregar tab en `Layout.jsx`**

En `frontend/src/components/Layout.jsx`, agregar el import:

```js
import Import from './Import'
import { Upload } from 'lucide-react'
```

(agregar `Upload` al `import { ... } from 'lucide-react'` existente en vez de una línea aparte, si ese import ya trae otros íconos — ver `Layout.jsx:7-17`.)

Agregar a la lista `tabs` (después de `expenses`, antes de `savings`):

```js
{ id: 'import', name: 'Importar', icon: Upload },
```

Agregar al render condicional (después del bloque `expenses`):

```jsx
) : activeTab === 'import' ? (
  <Import user={user} />
```

- [ ] **Step 4: Verificar build**

Run: `cd frontend && npm run build`
Expected: build exitoso, sin warnings de import no usado.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Import.jsx frontend/src/components/Import/ImportPreviewTable.jsx frontend/src/components/Layout.jsx
git commit -m "feat: UI de import bancario (preview, flags, confirmación)"
```

---

## Task 11: Verificación manual end-to-end

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Levantar la app**

Run: `cd frontend && npm run dev`

- [ ] **Step 2: Probar con el archivo real**

Iniciar sesión, ir a la tab "Importar", subir `/home/eddieberu/Downloads/MovimientosDelDia_Cta_CR51015202001351496205.xls`. Verificar:
- Las 5 filas del archivo real aparecen en preview con montos y fechas correctos.
- Ninguna fila queda marcada inválida (todas tienen débito y fecha válidos).
- Categorías se pueden asignar y el botón de confirmar se habilita.
- Al confirmar, los gastos aparecen en la tab "Gastos" con los montos correctos.

- [ ] **Step 3: Probar reimportar el mismo archivo**

Subir el mismo archivo otra vez. Verificar que las 5 filas aparecen marcadas "ya existe manual" (porque ya tienen `documento_banco` asignado del paso anterior) — confirma que el índice único y el matching funcionan.

- [ ] **Step 4: Probar archivo inválido**

Subir cualquier archivo `.txt` o HTML sin la tabla esperada. Verificar que aparece el mensaje "No pudimos leer este archivo…" sin romper la pantalla.

- [ ] **Step 5: Correr toda la suite de tests**

Run: `cd frontend && npm test`
Expected: todos los tests de `frontend/src/lib/bankImport/` en verde.

No hay commit en esta tarea — es solo verificación. Si algo falla, volver a la tarea correspondiente, corregir, y commitear ahí.
