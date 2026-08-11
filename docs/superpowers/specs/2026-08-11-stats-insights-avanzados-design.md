# Stats/insights avanzados

## Contexto

Segundo subsistema del roadmap (`docs/superpowers/ROADMAP.md`), después de presupuesto inteligente. La app ya tiene RPCs de agregación server-side (`get_income_expense_series`, `get_totals_by_category`, etc., en `20260705120000_create_stats_rpcs.sql`) y un dashboard con balance + top categorías, pero nada muestra tendencia en el tiempo, comparación mes a mes, ni avisa cuando una categoría se dispara.

Cubre:

1. Tab nuevo "Insights" con serie temporal ingreso vs gasto (6 meses).
2. Comparativa mes actual vs mes anterior por categoría de gasto.
3. Alertas de anomalía: categorías cuyo gasto este mes se disparó vs su promedio reciente.

## Fuera de alcance

- Distribución por día de semana / quincena del mes (evaluado y descartado — la serie temporal + comparativa ya responden "cómo gasto").
- RPCs nuevos en Supabase — todo se resuelve con `get_income_expense_series` y `get_totals_by_category`, ya existentes.
- Anomalías sobre ingresos (solo gastos).
- Configuración de umbral/ventana desde Ajustes — quedan fijos en código (ver reglas abajo); si se necesita ajustar por usuario, es un cambio futuro pequeño.

## Ubicación en la UI

Tab nuevo `insights` en `Layout.jsx` (entre `budgets` y `debts`), ícono `LineChart` de lucide-react. Componente `Insights.jsx` con tres cards en columna: serie temporal, comparativa por categoría, alertas de anomalía.

## Fetch compartido

`useMonthlyCategoryHistory()` (`frontend/src/hooks/useMonthlyCategoryHistory.js`):

- Pide `get_totals_by_category('gasto', inicio_mes, fin_mes)` (vía `fetchTotalsByCategory` en `lib/stats.js`, sin cambios) para cada uno de los últimos 4 meses (mes actual + 3 previos), en paralelo.
- Devuelve `{ months: [{ ym, categories: [{categoria, total, cantidad}] }], loading, error, stale, refresh }`, ordenado de más antiguo a más reciente (índice 3 = mes actual).
- Sigue el patrón de `useStats`: cache en `localforage` bajo cache key `monthly-cat-history:<ym-actual>`, revalida en background, conserva snapshot si falla el fetch.
- Esta misma data alimenta la comparativa y las alertas — un solo fetch, dos vistas.

`useIncomeExpenseSeries(months = 6)` (`frontend/src/hooks/useIncomeExpenseSeries.js`):

- Envuelve `fetchIncomeExpenseSeries({ start, end, granularity: 'month' })` (ya existe en `lib/stats.js`) con rango de los últimos 6 meses.
- Mismo patrón `useStats` con cache key `series:month:<n-meses>:<ym-actual>`.

## Serie temporal

Card superior. `AreaChart` o `LineChart` de Recharts (primera vez que se usa en el proyecto — la data ya sale con shape listo: `{ periodo, ingresos, gastos, balance }`). Dos series (ingreso, gasto), eje X = mes. Sigo la skill `dataviz` al implementar el chart (paleta, ejes, tooltip, accesibilidad).

- Sin datos (usuario nuevo, todos los meses en cero) → estado vacío explicativo en vez de gráfico en blanco.
- `stale` → mismo tag `tag-warning` que ya usa `CurrentBalance` ("Sin conexión · dato guardado").

## Comparativa mes a mes por categoría

Card intermedia. Por cada categoría presente en el mes actual o el anterior (unión de ambos conjuntos): barra doble (mes actual vs mes anterior) + delta %.

- Categoría nueva este mes (0 el mes anterior) → etiqueta "nueva" en vez de un porcentaje engañoso (división por cero).
- Categoría que desapareció (tenía gasto el mes anterior, 0 este mes) → se muestra igual, delta "−100%", para que la ausencia sea visible ("Honest over reassuring").
- Orden: por monto del mes actual, descendente.
- Sin categorías en ninguno de los dos meses → estado vacío ("Todavía no hay gastos categorizados para comparar").

## Alertas de anomalía

Card inferior. Función pura en `frontend/src/lib/insights.js`:

```
computeAnomalies(monthlyTotals: Array<{ ym, categories }>) -> Array<{ categoria, actual, promedioPrevio, deltaPct }>
```

Reglas:

1. Requiere al menos 3 meses previos con datos (`monthlyTotals.length >= 4`, incluyendo el mes actual). Si no hay suficiente historial, `computeAnomalies` devuelve `[]` y la UI muestra una nota ("Necesitás al menos 3 meses de historial para ver alertas") en vez de la card vacía sin explicación.
2. Para cada categoría presente en el mes actual: `promedioPrevio` = promedio de su gasto en los 3 meses anteriores (meses donde la categoría no aparece cuentan como 0).
3. `pisoMinimo` = 2% del gasto total promedio (todas las categorías) de esos 3 meses previos. Si `promedioPrevio < pisoMinimo`, la categoría se ignora — evita que una categoría nueva o de uso ocasional dispare un "+infinito%" ruidoso.
4. Si `(actual - promedioPrevio) / promedioPrevio >= 0.40` → se reporta como anomalía.
5. Resultado ordenado por `deltaPct` descendente. Sin límite artificial de cuántas se muestran (si hay 5 categorías disparadas, honestidad > gamificación de "top 3").

Cada alerta se muestra como línea directa: "Alimentación: ₡85 000 este mes vs ₡55 000 de promedio (+55%)" — sin tono de regaño, coherente con el resto de la app.

## Manejo de errores y estados vacíos

- Los tres hooks siguen el patrón `useStats`: cache local, `stale` visible, sin fallback silencioso, botón "Reintentar" en error igual que `CurrentBalance`.
- Card de anomalías sin datos suficientes → nota explicativa, no card oculta ni card vacía sin contexto.
- Comparativa y serie temporal con cero movimientos → estado vacío explicativo, mismo tono que el resto de la app (`sinMovimientos` en `CurrentBalance`).

## Archivos nuevos/tocados (referencia, no exhaustivo)

- `frontend/src/hooks/useMonthlyCategoryHistory.js`
- `frontend/src/hooks/useIncomeExpenseSeries.js`
- `frontend/src/lib/insights.js` (`computeAnomalies`, helpers de comparativa)
- `frontend/src/components/Insights.jsx` (página, compone las 3 cards)
- `frontend/src/components/Insights/SeriesChart.jsx`
- `frontend/src/components/Insights/CategoryComparison.jsx`
- `frontend/src/components/Insights/AnomalyAlerts.jsx`
- `frontend/src/components/Layout.jsx` — nuevo tab `insights`, ícono `LineChart`, reemplaza el placeholder genérico para ese tab
