# Agent Skill: PolloAsado Project Guidelines

This file defines the strict guidelines, constraints, database schemas, and conventions for any AI agent working on the **PolloAsado** project. Agents must read and adhere to this skill at all times.

---

## 1. Propósito (Purpose)

**PolloAsado** is a personal finance tracker designed for a single user to track, manage, and visualize their incomes, expenses, savings, debts, and budgets.

### The "Deseos" (Desires) Concept:
There is no separate table for "Deseos". Instead, a **Deseo** is represented as a target-driven item in the `ahorros` (savings) table. 
* To implement a desire: The user sets a saving target with a specific `nombre` (name) and `monto_meta` (target amount).
* Development should present these items in the UI as "Deseos / Metas de Ahorro" to show progress toward purchase goals.
* Do not present them to the user as Deseos. You can point out Ahorros can be used to plan future purchases but should not be main focus.

---

## 2. Límites (Hard Boundaries)

All development by AI agents must respect the following limits:

### Database & Migrations:
* **Schema Reference**: The database is structured exactly according to [supabase/squema.sql](file:///home/eddieberu/Documents/projects/personal-projects/PolloAsado/supabase/squema.sql) and [supabase/rls.sql](file:///home/eddieberu/Documents/projects/personal-projects/PolloAsado/supabase/rls.sql).
* **Schema Modification**: Do NOT modify the tables, columns, or relations of the database directly on the live database. Any schema alterations must go through local migration files under `supabase/migrations/` using proper SQL syntax.
* **RLS (Row Level Security)**: Every table must have RLS active. All queries fetching, inserting, or modifying data must filter by the authenticated user's ID (`auth.uid() = user_id`).
* **Sub-transactions & Breakdowns**: For flexible and deep insights/reporting, any "desglose" (breakdown/split bills/deductions) inside an Income or Expense MUST be modeled using strict relational tables (e.g., `desglose_ingresos`, `desglose_gastos`) connected via Foreign Keys. Do not use `JSONB` columns for relational or report-heavy data.
* **Local-First & Offline Sync Architecture**: The application must support PWA capabilities (offline usage) and store data locally using IndexedDB (`localforage`). Sync with Supabase happens in the background.
* **User Preferences & Categories**: User-defined custom categories and UI preferences (e.g., themes) are stored in the `perfiles` table using a `preferencias JSONB` column.
* **MANDATORY SKILL UPDATES**: The AI must proactively update this skill file (`pollo_asado_skill.md`) with every piece of important architectural, design, or project-wide information that arrives or is decided upon during conversations. This is a strict clause.

### Frontend Tech Stack & Styles (Tailwind CSS v4):
* **Styling Framework**: Tailwind CSS v4 is used. Configuration is done directly in `src/index.css` using the `@theme` directive.
* **Warm Aesthetic** (supersedes the previous "minimalist, dark-mode first" clause): the design is **calm, warm, and personal** — closer to a personal notebook than to a bank. References: Notion, Things. Roomy spacing, friendly typography, low visual pressure. Warmth is carried by space, type, and copy, **never** by decoration. **Flat colors remain mandatory**: flashy gradients, glowing highlights, and neon effects are still strictly prohibited. Moderate color is permitted: borders can use the active theme's accent color (colored uniformly across the component/container rather than emphasizing a single border), and titles, headings, and specific indicators may have color accents, kept unsaturated and balanced. Strategic context, users, positioning, anti-references, and design principles live in [PRODUCT.md](file:///home/eddieberu/Documents/projects/personal-projects/PolloAsado/PRODUCT.md); read it before any design work.
* **Customizable Palette**: Colors are defined via CSS variables mapped to Tailwind colors (e.g. `bg-app`, `surface-app`, `text-primary`, `accent-app`, `border-app`). The theme changes by altering the `data-theme` attribute on the `<body>`.
* **No Conflicting CSS**: Do not install other CSS frameworks. Ensure custom Tailwind usage matches this clean, flat aesthetic.
* **Token contract (`src/index.css`)**: never hardcode a Tailwind palette color (`text-emerald-400`, `bg-rose-950/20`, …) in a component. Every color goes through a token.
  * Shell: `bg-app` / `surface-app` / `surface-raised` (elevation is lightness, never shadow), `text-primary` / `text-secondary` / `text-muted`, `border-app` (decorative) / `border-strong` (interactive controls).
  * Semantic, fixed meaning app-wide: `positive` = money in / confirmed, `negative` = money out / destructive, `warning` = pending or unresolved. Each has `-soft` (14% surface tint) and `-line` (32% border) variants. Never the only signal — always pair with a sign, label, or icon.
  * Accent: `accent-app` follows `data-theme`; the five values live in `--accent-slate|emerald|sky|amber|rose` and the picker swatches read those same variables. `--color-accent-app` is re-resolved on `body` so the theme attribute works on either `<html>` or `<body>`.
  * Component classes: `.card`, `.well` (nested detail / desglose), `.btn-primary` / `.btn-secondary` / `.btn-danger` / `.btn-icon`, `.input`, `.notice-positive|negative|warning`, `.tag-warning`, `.heading`.
  * All pairs verified for contrast: lowest body-text ratio in the system is 4.52:1, interactive borders hit the 3:1 UI floor.
* **Visual spec**: [DESIGN.md](file:///home/eddieberu/Documents/projects/personal-projects/PolloAsado/DESIGN.md) is the normative visual system — creative north star ("The Evening Desk"), named colors, type hierarchy, elevation doctrine, component specs, and do's/don'ts. Read it before generating any new screen or component. `.impeccable/design.json` is its machine-readable sidecar (tonal ramps, motion tokens, renderable component snippets); regenerate both together via `/impeccable document`, never edit the sidecar by hand.

### Development Language:
* **Code & Comments**: All development code, including variables, comments, function names, filenames, and documentation, must be in **English**.
* **UI Copy**: All user-facing copies, buttons, labels, and notifications must be in **Spanish**.

### Directory Structure:
Any new React code must be strictly organized into these folders under `frontend/src/`:
* `src/components/` - Visual, modular, and reusable components.
* `src/services/` or `src/lib/` - API and Supabase communication functions.
* `src/hooks/` - Custom hooks for sharing component logic.

---

## 3. Deseos (Agent Preferences & Anti-AI Slop)

* **Anti-AI Slop Enforcement**: Future agents must load and respect the system-wide `impeccable` and `anti aislop text/ui` guidelines. No robotic comments, no bloated padding, and no generic, useless helper labels. Keep copy concise, utility-focused, and premium.
* **UI Design**: Flat layouts, high contrast, clean text alignments, and minimal micro-animations on interactive elements (scale 98% on click, subtle background shifts on hover). No placeholders.
* **State Management**: Use React's local state, Context API, or React Router state.

---

## 4. SQL Schema Reference

For fast access, the database schema is replicated below:

### Table Schema (`supabase/squema.sql`):
```sql
-- Perfiles de usuario (extiende el auth de Supabase)
CREATE TABLE perfiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nombre TEXT,
  preferencias JSONB DEFAULT '{"categorias_ingreso": [], "categorias_gasto": [], "tema": "slate"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingresos: cuánto y cuándo
CREATE TABLE ingresos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  descripcion TEXT,
  categoria TEXT,
  fecha DATE NOT NULL,
  es_recurrente BOOLEAN DEFAULT FALSE,
  frecuencia TEXT, -- 'mensual', 'quincenal', 'semanal'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gastos: fijos y variables
CREATE TABLE gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  descripcion TEXT NOT NULL,
  categoria TEXT NOT NULL, -- 'comida', 'transporte', 'hormiga', etc.
  lugar TEXT,
  fecha DATE NOT NULL,
  es_fijo BOOLEAN DEFAULT FALSE,
  es_recurrente BOOLEAN DEFAULT FALSE,
  frecuencia TEXT, -- 'mensual', 'semanal', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deudas
CREATE TABLE deudas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  descripcion TEXT NOT NULL,
  monto_total DECIMAL(12,2) NOT NULL,
  monto_pagado DECIMAL(12,2) DEFAULT 0,
  cuota_mensual DECIMAL(12,2),
  tasa_interes DECIMAL(5,2) DEFAULT 0, -- porcentaje
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Abonos a deudas
CREATE TABLE abonos_deuda (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deuda_id UUID REFERENCES deudas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  fecha DATE NOT NULL,
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ahorros
CREATE TABLE ahorros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  nombre TEXT NOT NULL, -- 'Fondo de emergencia', 'Vacaciones' (también Deseos)
  monto_meta DECIMAL(12,2),
  monto_actual DECIMAL(12,2) DEFAULT 0,
  es_automatico BOOLEAN DEFAULT FALSE,
  frecuencia TEXT,
  monto_automatico DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Presupuesto mensual por categoría
CREATE TABLE presupuestos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  categoria TEXT NOT NULL,
  monto_limite DECIMAL(12,2) NOT NULL,
  mes INT NOT NULL,   -- 1-12
  anio INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security Policies (`supabase/rls.sql`):
```sql
-- Activar RLS en cada tabla
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE deudas ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonos_deuda ENABLE ROW LEVEL SECURITY;
ALTER TABLE ahorros ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;

-- Policies: cada usuario ve y modifica solo sus datos
CREATE POLICY "usuario_solo_ve_los_suyos" ON ingresos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "usuario_solo_ve_los_suyos" ON gastos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "usuario_solo_ve_los_suyos" ON deudas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "usuario_solo_ve_los_suyos" ON abonos_deuda FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "usuario_solo_ve_los_suyos" ON ahorros FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "usuario_solo_ve_los_suyos" ON presupuestos FOR ALL USING (auth.uid() = user_id);
```
