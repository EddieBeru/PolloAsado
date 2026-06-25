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

### Frontend Tech Stack & Styles (Tailwind CSS v4):
* **Styling Framework**: Tailwind CSS v4 is used. Configuration is done directly in `src/index.css` using the `@theme` directive.
* **Minimalist Aesthetic**: The design must be **minimalist** and **dark-mode first**, utilizing **flat colors**. Flashy gradients, glowing highlights, and neon effects are strictly prohibited. However, moderate use of color is permitted: borders can use the active theme's accent color (provided they are colored uniformly across the component/container rather than emphasizing a single border), and titles, headings, and specific indicators may have color accents, keeping the balance professional and not overly saturated.
* **Customizable Palette**: Colors are defined via CSS variables mapped to Tailwind colors (e.g. `bg-app`, `surface-app`, `text-primary`, `accent-app`, `border-app`). The theme changes by altering the `data-theme` attribute on the `<body>`.
* **No Conflicting CSS**: Do not install other CSS frameworks. Ensure custom Tailwind usage matches this clean, flat aesthetic.

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
