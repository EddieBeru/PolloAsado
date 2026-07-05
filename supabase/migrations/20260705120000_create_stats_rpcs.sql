-- Capa de agregación server-side para estadísticas.
-- Todas las funciones son SECURITY INVOKER (default) para que la RLS
-- (auth.uid() = user_id) siga aplicando; además filtran user_id = auth.uid().
-- Los montos DECIMAL salen como string en PostgREST; el wrapper JS hace Number().

-- 1. Balance general hasta una fecha (default hoy). El card "Cuenta" no debe
--    incluir proyecciones futuras de recurrencia, por eso el filtro fecha <= p_hasta.
create or replace function public.get_balance(p_hasta date default current_date)
returns table (total_ingresos numeric, total_gastos numeric, balance numeric)
language sql stable security invoker
as $$
  select
    coalesce((select sum(monto) from ingresos
       where user_id = auth.uid() and fecha <= p_hasta), 0) as total_ingresos,
    coalesce((select sum(monto) from gastos
       where user_id = auth.uid() and fecha <= p_hasta), 0) as total_gastos,
    coalesce((select sum(monto) from ingresos
       where user_id = auth.uid() and fecha <= p_hasta), 0)
      - coalesce((select sum(monto) from gastos
       where user_id = auth.uid() and fecha <= p_hasta), 0) as balance;
$$;

-- 2. Totales en un rango de fecha arbitrario (NULL = sin límite). Reutilizable
--    por cualquier pantalla / KPI / total-por-mes autoritativo.
create or replace function public.get_range_totals(
  p_start date default null,
  p_end   date default null
)
returns table (total_ingresos numeric, total_gastos numeric, balance numeric)
language sql stable security invoker
as $$
  with i as (
    select coalesce(sum(monto), 0) as s from ingresos
    where user_id = auth.uid()
      and (p_start is null or fecha >= p_start)
      and (p_end   is null or fecha <= p_end)
  ),
  g as (
    select coalesce(sum(monto), 0) as s from gastos
    where user_id = auth.uid()
      and (p_start is null or fecha >= p_start)
      and (p_end   is null or fecha <= p_end)
  )
  select i.s, g.s, i.s - g.s from i, g;
$$;

-- 3. Serie temporal ingreso-vs-gasto: una fila por periodo con ambas series.
--    p_granularity: 'day' | 'week' | 'month' | 'year'. Shape listo para Recharts.
create or replace function public.get_income_expense_series(
  p_start date default null,
  p_end   date default null,
  p_granularity text default 'month'
)
returns table (periodo date, ingresos numeric, gastos numeric, balance numeric)
language sql stable security invoker
as $$
  with i as (
    select date_trunc(p_granularity, fecha)::date as periodo, sum(monto) as total
    from ingresos
    where user_id = auth.uid()
      and (p_start is null or fecha >= p_start)
      and (p_end   is null or fecha <= p_end)
    group by 1
  ),
  g as (
    select date_trunc(p_granularity, fecha)::date as periodo, sum(monto) as total
    from gastos
    where user_id = auth.uid()
      and (p_start is null or fecha >= p_start)
      and (p_end   is null or fecha <= p_end)
    group by 1
  )
  select
    coalesce(i.periodo, g.periodo) as periodo,
    coalesce(i.total, 0) as ingresos,
    coalesce(g.total, 0) as gastos,
    coalesce(i.total, 0) - coalesce(g.total, 0) as balance
  from i full outer join g on i.periodo = g.periodo
  order by 1;
$$;

-- 4. Totales agrupados por categoría. p_tipo: 'ingreso' | 'gasto'.
create or replace function public.get_totals_by_category(
  p_tipo  text,
  p_start date default null,
  p_end   date default null
)
returns table (categoria text, total numeric, cantidad bigint)
language sql stable security invoker
as $$
  select coalesce(categoria, 'Sin categoria') as categoria,
         sum(monto) as total,
         count(*)   as cantidad
  from (
    select categoria, monto, fecha from ingresos
      where p_tipo = 'ingreso' and user_id = auth.uid()
    union all
    select categoria, monto, fecha from gastos
      where p_tipo = 'gasto' and user_id = auth.uid()
  ) t
  where (p_start is null or fecha >= p_start)
    and (p_end   is null or fecha <= p_end)
  group by 1
  order by total desc;
$$;

-- 5. Top-N categorías (wrapper de #4).
create or replace function public.get_top_categories(
  p_tipo  text,
  p_limit int  default 5,
  p_start date default null,
  p_end   date default null
)
returns table (categoria text, total numeric, cantidad bigint)
language sql stable security invoker
as $$
  select * from public.get_totals_by_category(p_tipo, p_start, p_end)
  order by total desc
  limit p_limit;
$$;

grant execute on function public.get_balance(date) to authenticated;
grant execute on function public.get_range_totals(date, date) to authenticated;
grant execute on function public.get_income_expense_series(date, date, text) to authenticated;
grant execute on function public.get_totals_by_category(text, date, date) to authenticated;
grant execute on function public.get_top_categories(text, int, date, date) to authenticated;

-- Índices para acelerar los RPCs y los pulls con ventana de fecha.
-- Recurrencia inserta una fila por fecha proyectada, así que el conteo crece.
create index if not exists idx_ingresos_user_fecha on ingresos (user_id, fecha);
create index if not exists idx_gastos_user_fecha   on gastos   (user_id, fecha);
