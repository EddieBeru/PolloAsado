# Import bancario — diseño

Subsistema del [roadmap](../../../ROADMAP.md), posición 4 (independiente, se puede adelantar si urge volumen de datos).

## Propósito

Importar movimientos desde el export de BCR (cuenta de ahorros en colones) en vez de captura manual uno por uno, con precisión: nada se inserta sin que el usuario lo confirme, y nada se duplica — ni contra imports repetidos, ni contra lo ya capturado a mano.

## Alcance v1

- **Banco:** BCR (Banco de Costa Rica), cuenta de ahorros en colones. BAC/BN y PDF quedan fuera, fase futura.
- **Formato de entrada:** el export "Movimientos del día" de BCR. El archivo trae extensión `.xls` pero es HTML disfrazado — parseo de tabla HTML, no librería de Excel.
- **Formato de la tabla fuente** (headers reales, confirmados con archivo de ejemplo):

  | Fecha contable | Fecha transacción | Hora | Documento | Descripción | Débitos | Créditos |
  |---|---|---|---|---|---|---|
  | 10/08/2026 | 06/08/2026 | 05:01 | 325495 | COMPRAS EN COMERCIOS / 01880055 +002SODA DEPORTES | -1,800.00 | |

  `Fecha transacción` es la fecha real del hecho (se usa para `fecha`); `Fecha contable` es cuándo el banco lo contabilizó (se descarta, no se usa para nada en v1). `Documento` es el folio/autorización — identificador único del banco para ese movimiento.

## Arquitectura

**Sin tabla de staging.** El archivo se parsea en el cliente (browser), la revisión ocurre en memoria (estado de React), y el insert final va directo a `gastos`/`ingresos` al confirmar. No hay tabla intermedia de movimientos pendientes.

**Por qué:** el review es una sola sesión — subís archivo, revisás, confirmás. No es un flujo que necesite sobrevivir a cerrar la pestaña. Si el usuario cierra a medio review y reimporta el mismo archivo, los movimientos ya confirmados se detectan por `documento_banco` (columna nueva, ver abajo) y aparecen marcados "ya importado" automáticamente — no se pierde trabajo, no hace falta persistir estado intermedio.

### Cambios de esquema

```sql
-- gastos e ingresos, misma migración:
ALTER TABLE gastos ADD COLUMN origen TEXT NOT NULL DEFAULT 'manual'; -- 'manual' | 'importado'
ALTER TABLE gastos ADD COLUMN documento_banco TEXT;
CREATE UNIQUE INDEX idx_gastos_documento_banco ON gastos (user_id, documento_banco) WHERE documento_banco IS NOT NULL;

ALTER TABLE ingresos ADD COLUMN origen TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE ingresos ADD COLUMN documento_banco TEXT;
CREATE UNIQUE INDEX idx_ingresos_documento_banco ON ingresos (user_id, documento_banco) WHERE documento_banco IS NOT NULL;
```

El índice único es la garantía real contra reimportar el mismo movimiento dos veces — no depende solo de la lógica de UI.

```sql
-- reglas de categorización aprendidas
CREATE TABLE reglas_categorizacion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  patron TEXT NOT NULL,       -- substring a buscar en la descripción normalizada
  categoria TEXT NOT NULL,
  tipo TEXT NOT NULL,         -- 'ingreso' | 'gasto'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, patron, tipo)
);
```

### Parser

Función pura `parseBCR(htmlString) -> MovimientoCrudo[]`, donde cada `MovimientoCrudo` es:

```
{ fecha, hora, documento, descripcion, monto, tipo }  // tipo: 'gasto' | 'ingreso'
```

- `descripcion` se guarda tal cual viene del banco (texto completo, ej. `"COMPRAS EN COMERCIOS / 01880055 +002SODA DEPORTES"`); se normaliza (mayúsculas, trim, sin números de terminal) solo para el matching de reglas de categorización y de duplicados por comercio, no para lo que se guarda en `descripcion`.
- `monto` se parsea de string con comas (`"-1,800.00"` / `"19,040.00"`) a número, siempre positivo — el signo original solo decide `tipo`.
- Fila sin `Débitos` ni `Créditos`, o con ambos vacíos → fila inválida, se excluye del preview con marca de error (ver Manejo de errores).

### Detección de casos raros

Todo esto se calcula en memoria después de parsear, antes de mostrar el preview. Ninguno se resuelve solo — todos requieren decisión explícita del usuario antes de poder confirmar el import.

**1. Ya existe manual.** Para cada movimiento importado sin flag previo: busca en `gastos`/`ingresos` del mismo `tipo` con `documento_banco IS NULL`, mismo `monto`, `fecha` dentro de ±1 día. Si hay match → flag "¿ya la capturaste a mano?" con 3 opciones: vincular (le pone `documento_banco` a la fila existente, no crea nueva), importar de todas formas (crea una fila nueva, asume que son dos movimientos distintos que coinciden en monto/fecha por casualidad), omitir.

**2. Cargo doble por autorización.** Dentro del mismo archivo importado: dos filas con descripción normalizada igual (mismo comercio) y `fecha` dentro de 2 días una de la otra → flag "posible cargo doble" con 3 opciones: son el mismo cargo (autorización + ajuste), quedarse con uno — el usuario elige cuál; son 2 cargos reales, importar ambos; editar monto de una antes de decidir (cubre el caso típico de autorización con monto preliminar vs. monto final distinto).

### Categorización sugerida

Al armar el preview, por cada movimiento se normaliza la descripción y se busca match de `patron` (substring) contra `reglas_categorizacion` del usuario para ese `tipo`. Si hay match, la categoría llega pre-rellenada pero editable. Si no hay match, llega vacía ("sin categorizar").

Al confirmar el import, por cada fila donde el usuario asignó/cambió categoría a mano y marcó el checkbox "recordar", se hace upsert en `reglas_categorizacion` (patrón = descripción normalizada del comercio, ej. `"SODA DEPORTES"`).

## Flujo UI

1. Tab/sección "Importar" → botón subir archivo (acepta `.xls`/`.html`).
2. Parse en cliente. Si falla (ver errores) se corta ahí con mensaje, no se llega a preview.
3. Preview: tabla con todas las filas parseadas — fecha, descripción, monto, tipo, categoría (editable/select), checkbox de inclusión (pre-marcado salvo filas inválidas). Filas con flag de "ya existe manual" o "cargo doble" aparecen agrupadas arriba, con su selector de resolución, bloqueando el botón de confirmar hasta que todas estén resueltas.
4. Botón "Confirmar import (N filas)" — N se actualiza según lo marcado. Deshabilitado si quedan flags sin resolver.
5. Insert batch a `gastos`/`ingresos` con `origen='importado'`, `documento_banco`, categoría final. Reglas marcadas "recordar" se guardan.
6. Resumen: "X movimientos importados, Y vinculados a existentes, Z omitidos."

## Manejo de errores

- **Archivo no reconocible** (no es la tabla HTML esperada de BCR): mensaje "no pudimos leer este archivo — ¿es un export de movimientos de BCR?", no crashea, no avanza a preview.
- **Archivo sin movimientos** (tabla vacía, ej. día sin transacciones): mensaje "este archivo no tiene movimientos", no se trata como error.
- **Fila con monto o fecha inválida**: se muestra en preview marcada "dato inválido", excluida de la selección por defecto; el usuario puede editar el valor para incluirla o dejarla fuera.
- **Constraint único violado al insertar** (carrera, doble clic en confirmar, o `documento_banco` que se coló repetido dentro del mismo batch): esa fila puntual se salta con aviso, el resto del batch se inserta igual — no aborta el import completo.

## Fuera de alcance v1 (fases futuras, mismo roadmap)

- CSV genérico para cualquier banco.
- PDF de estado de cuenta.
- BAC, Banco Nacional u otros bancos de CR.
- Multi-cuenta / multi-banco simultáneo.
