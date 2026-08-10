# Roadmap

Subsistemas grandes identificados en brainstorm de app "superpoderosa" (2026-08-10). Cada uno necesita su propio ciclo spec → plan → implementación vía `superpowers:brainstorming`.

## En progreso / primero

**Presupuesto inteligente: gastos fijos, 50/30/20, ahorros, consejos**
Spec: `docs/superpowers/specs/2026-08-10-gastos-fijos-presupuesto-inteligente-design.md`
Checklist de fijos con alerta, balde needs/wants/savings configurable, CRUD de metas de ahorro, motor de consejos basado en reglas.

## Pendientes

**Import bancario**
Importar movimientos desde estados de cuenta de bancos (PDF/CSV) en vez de captura manual una por una. Requiere definir qué bancos/formatos soportar primero, mapeo a categorías existentes, y cómo evitar duplicados contra lo ya registrado manualmente.

**Stats/insights avanzados**
Más allá del balde 50/30/20 — patrones de gasto, comparativas mes a mes, alertas de anomalías. Depende de tener buena data ya fluyendo (fijos categorizados, balde configurado), así que tiene más sentido después del presupuesto inteligente.

**Hub de deseos y proyectos futuros**
Espacio pa' anotar deseos/proyectos (compras futuras, metas grandes) que se conecte con las metas de ahorro ya existentes y reciba consejos financieros sobre cómo priorizarlos. Se apoya en el motor de consejos del presupuesto inteligente, así que también viene después.

## Orden sugerido

1. Presupuesto inteligente (en progreso)
2. Stats/insights avanzados — reusa mapeo de baldes y datos ya categorizados
3. Hub de deseos — reusa metas de ahorro + motor de consejos
4. Import bancario — independiente de los anteriores, se puede adelantar si urge más volumen de datos
