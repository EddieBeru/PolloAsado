# PolloAsado

Gestor de finanzas personales para uso propio y de un círculo pequeño: ingresos, gastos, ahorros, deudas y presupuestos, con desglose por línea en vez de solo totales.

En el teléfono es captura (registrar un movimiento en segundos, a veces sin señal). En el escritorio es revisión (leer saldo, presupuestos y deuda en una sola pantalla).

## Stack

- **Frontend**: React 19 + Vite 8, Tailwind CSS 4, `lucide-react`, `recharts`
- **Datos**: Supabase (Postgres + Auth + RLS), acceso vía `@supabase/supabase-js`
- **Offline**: `localforage` como caché local, PWA con `vite-plugin-pwa` (`registerType: autoUpdate`)

## Estructura

```
frontend/          app React (Vite)
  src/components/  pantallas: Dashboard, Income, Outcome, Debt, Settings, Login, Layout
  src/hooks/       datos y estado: useBalance, useIncomes, useOutcomes, useStats, useSettings, ...
  src/lib/         supabaseClient, balance, period, format, stats, authErrors
supabase/
  squema.sql       esquema base
  migrations/      migraciones incrementales
  rls.sql          políticas Row Level Security
DESIGN.md          sistema de diseño (tokens, tipografía, espaciado)
PRODUCT.md         definición de producto: usuarios, propósito, principios
```

## Puesta en marcha

Requiere Node 20+ y un proyecto de Supabase.

```bash
cd frontend
npm install
```

Crear `frontend/.env.local`:

```bash
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Correr en desarrollo:

```bash
npm run dev
```

Otros scripts: `npm run build`, `npm run preview`, `npm run lint`.

## Base de datos

Aplicar el esquema y las migraciones al proyecto de Supabase, y después las políticas RLS:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Tablas principales: `perfiles`, `ingresos`, `gastos`, `desglose_ingresos`, `desglose_gastos`, `ahorros`, `presupuestos`, `deudas`, `abonos_deuda`, `debts`.

Los agregados se calculan en Postgres, no en el cliente. RPCs disponibles (`supabase/migrations/20260705120000_create_stats_rpcs.sql`):

| Función | Devuelve |
|---|---|
| `get_balance(p_hasta)` | saldo acumulado hasta una fecha |
| `get_range_totals(p_start, p_end)` | totales de ingreso y gasto en un rango |
| `get_income_expense_series(p_start, p_end, p_bucket)` | serie temporal por bucket |
| `get_totals_by_category(p_tipo, p_start, p_end)` | totales por categoría |
| `get_top_categories(p_tipo, p_limit, p_start, p_end)` | categorías con más movimiento |

Todas están otorgadas al rol `authenticated` y filtradas por RLS: cada cuenta solo ve sus propios datos.

## Cómo funciona la app

- **Auth**: Supabase Auth con contraseña y magic link. El evento `PASSWORD_RECOVERY` abre la pantalla de cambio de clave (`UpdatePassword`).
- **Navegación**: una sola pantalla con pestañas en `Layout` — Inicio, Ingresos, Gastos, Ahorros, Presupuestos, Deudas, Ajustes. No hay router.
- **Temas**: cinco acentos (`slate`, `emerald`, `sky`, `amber`, `rose`) guardados en `localStorage` bajo `pollo_asado_theme` y aplicados como `data-theme`.
- **Offline-first**: los listados se sirven de caché local y se sincronizan contra Supabase; los fallos de sincronización se reportan en la interfaz en vez de tragarse.

## Diseño

`DESIGN.md` es la fuente de verdad: tokens de color, escala tipográfica y espaciado. Reglas duras — color plano, sin gradientes, sin brillos ni neón. La calidez viene del espacio y de las palabras, no de la decoración. La copia de interfaz es en español, breve y sin relleno.

## Licencia

Ver [LICENSE](LICENSE).
