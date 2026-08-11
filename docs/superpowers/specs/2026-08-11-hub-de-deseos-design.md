# Hub de deseos y proyectos futuros — diseño

Subsistema del [roadmap](../../../ROADMAP.md), posición 3 (después de presupuesto inteligente en el orden sugerido, pero su spec no depende de que ese código ya exista — ver "Motor de consejos").

## Propósito

Espacio pa' anotar deseos/proyectos (compras futuras, metas grandes) fuera del flujo normal de ingresos/gastos, que el usuario pueda priorizar y, cuando decida empezar a apartar plata pa' uno, convertir en una meta de ahorro real sin perder el registro original.

## Alcance v1

- CRUD de deseos: nombre, costo estimado, prioridad, estado, notas.
- Vínculo opcional 1:1 con una meta de ahorro (`ahorros`) — un deseo puede vivir sin meta asociada; el usuario decide cuándo "activarlo".
- Consejos básicos de priorización, calculados solo con datos del hub (deseos + su meta de ahorro vinculada si existe) — **no** depende del motor de consejos de presupuesto inteligente (`generarConsejos`), que a la fecha de este spec sigue sin implementar. Si ese motor llega después, se integra en una fase futura; este spec no lo asume ni lo bloquea.
- Vive como sección dentro del tab existente "Ahorros" (no tab nuevo), reforzando la relación visual entre deseos y metas.

## Fuera de alcance v1

- Historial de cambios de un deseo (ediciones, cambios de prioridad).
- Consejos que combinen datos de presupuesto/balde 50-30-20 — fase futura, cuando exista `generarConsejos`.
- Adjuntar imágenes/links de referencia al deseo.
- Compartir o colaborar en deseos entre usuarios.

## Modelo de datos

Nueva migración `supabase/migrations/`:

```sql
CREATE TABLE deseos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  nombre TEXT NOT NULL,
  costo_estimado DECIMAL(12,2) NOT NULL,
  prioridad TEXT NOT NULL DEFAULT 'media',  -- 'alta' | 'media' | 'baja'
  estado TEXT NOT NULL DEFAULT 'activo',    -- 'activo' | 'cumplido' | 'descartado'
  ahorro_id UUID REFERENCES ahorros(id),    -- NULL hasta que se "activa" como meta
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deseos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario_solo_ve_los_suyos" ON deseos FOR ALL USING (auth.uid() = user_id);
```

Mismo patrón que `ahorros`/`presupuestos` (esquema plano, RLS por `user_id`, sin FKs raras). `ahorros` no cambia de esquema — el vínculo vive en `deseos.ahorro_id`, no al revés, así una meta de ahorro creada directo en Ahorros (sin pasar por un deseo) no necesita ningún campo nuevo.

## CRUD de deseos

- `useDeseos(user)`: mismo patrón que `useOutcomes`/`useIncomes` — carga local vía `localforage` (store propio `deseos`), sync contra tabla `deseos` con push optimista de pendientes, `persist()` helper pa' errores de caché, `syncError` visible en UI. Sin paginación por fecha (a diferencia de outcomes/incomes) — se trae todo, volumen esperado es bajo (decenas, no miles).
- `DeseoForm`: campos `nombre` (requerido), `costo_estimado` (requerido, numérico > 0), `prioridad` (select alta/media/baja, default media), `notas` (opcional, textarea). Sin campo de meta de ahorro en el form — el vínculo se hace después, desde la lista.
- `DeseoList`: tarjetas agrupadas por `estado` — activos primero (ordenados por prioridad alta→media→baja, luego por `created_at` descendente dentro de cada prioridad), cumplidos y descartados colapsados debajo en una sección "Historial" cerrada por defecto.
- Acciones por tarjeta: editar, marcar cumplido, marcar descartado, eliminar. Marcar cumplido/descartado es solo cambio de `estado` — no toca la meta de ahorro vinculada, si existe (el usuario decide aparte qué hacer con esa plata).

## Vínculo con meta de ahorro

- Tarjeta de deseo sin `ahorro_id`: botón "Convertir en meta de ahorro".
- Al hacer clic: crea fila en `ahorros` con `nombre` = nombre del deseo, `monto_meta` = `costo_estimado`, `monto_actual` = 0 (usuario puede editar estos valores en el mismo paso vía un `AhorroForm` precargado, antes de confirmar). Al guardar, hace `update` en `deseos` seteando `ahorro_id`.
- Tarjeta de deseo con `ahorro_id`: en vez del botón, muestra barra de progreso `monto_actual/monto_meta` (mismos datos que ya expone `useSavings`/`ahorros`, solo se lee la fila vinculada) y link "Ver en Metas de ahorro" que hace scroll a la tarjeta correspondiente en la sección de abajo.
- Si el usuario borra la meta de ahorro desde la sección de Ahorros (fuera del hub), `deseos.ahorro_id` queda apuntando a una fila que ya no existe — la UI del hub debe tolerarlo: si el `SELECT` con join no encuentra la meta, trata la tarjeta como si no tuviera vínculo (vuelve a mostrar "Convertir en meta de ahorro") en vez de romper.

## Motor de consejos de priorización

Función pura, sin llamadas externas, en `frontend/src/lib/consejosDeseos.js`:

```
generarConsejosDeseos(deseos) -> string[] (máx 2 mensajes)
```

Solo opera sobre deseos con `estado = 'activo'` y los datos de su meta de ahorro vinculada (si tiene). Reglas, en orden de prioridad (se evalúan en orden, se toman los primeros 2 mensajes que apliquen):

1. **Meta ya alcanzada:** si algún deseo vinculado tiene `monto_actual >= monto_meta` → `"'{nombre}' ya juntó la plata que necesitaba — marcalo como cumplido cuando lo compres."` (uno por deseo que aplique, hasta el límite de 2 mensajes).
2. **Ritmo de ahorro automático:** si algún deseo vinculado tiene `es_automatico = true` con `monto_automatico` y `frecuencia` → calcula meses restantes = `(monto_meta - monto_actual) / monto_mensual_equivalente` (semanal ×4.33, quincenal ×2, mensual ×1) → `"A este ritmo te faltan {Y} meses pa' '{nombre}'."` Si `monto_mensual_equivalente` es 0 o el cálculo da negativo/infinito, se omite (evita mensajes sin sentido).
3. **Demasiados de alta prioridad sin arrancar:** si hay 2+ deseos con `prioridad = 'alta'` y `ahorro_id IS NULL` → `"Tenés {N} deseos de alta prioridad sin meta de ahorro — elegí uno pa' empezar."`
4. **Sin deseos activos o nada que decir:** sin mensajes (no rellenar con ruido) — mismo criterio que el motor de consejos de presupuesto inteligente.

Se muestra en una card encima de `DeseoList`, dentro de la sección "Deseos" del tab Ahorros. Si `generarConsejosDeseos` devuelve `[]`, la card no se renderiza.

## Manejo de errores y estados vacíos

- Sin deseos activos → estado vacío ("Todavía no anotaste ningún deseo") con el botón de crear, sección "Historial" oculta si tampoco hay cumplidos/descartados.
- `costo_estimado` inválido (vacío, no numérico, ≤0) → el form no deja guardar, mismo patrón de validación inline que `AhorroForm`/`OutcomeForm`.
- Falla el insert al "convertir en meta de ahorro" → error visible en la tarjeta ("No se pudo crear la meta, intentá de nuevo"), el deseo queda como estaba (sin `ahorro_id`), no se crea una fila huérfana en `ahorros`.
- Sync de `deseos` sigue el patrón ya establecido: `persist()` local primero, error de sync visible sin bloquear la UI, reintento en el próximo `syncWithSupabase`.

## Archivos nuevos/tocados (referencia, no exhaustivo)

- `supabase/migrations/<timestamp>_create_deseos_table.sql`
- `frontend/src/hooks/useDeseos.js`
- `frontend/src/lib/consejosDeseos.js`
- `frontend/src/components/Savings/DeseoForm.jsx`
- `frontend/src/components/Savings/DeseoList.jsx`
- `frontend/src/components/Savings/AhorroList.jsx` (o donde viva el tab Ahorros) — agrega sección "Deseos" arriba de metas de ahorro, con la card de consejos
