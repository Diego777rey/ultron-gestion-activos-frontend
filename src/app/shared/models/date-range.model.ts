/** Rango de fechas inclusive, pensado para filtros de listados. */
export interface DateRangeValue {
  start: Date | null;
  end: Date | null;
}

/** Devuelve el rango de los últimos `days` días (incluye hoy). */
export function dateRangeLastDays(days = 7): DateRangeValue {
  const end = startOfDay(new Date());
  const start = startOfDay(new Date());
  start.setDate(start.getDate() - Math.max(days - 1, 0));
  return { start, end };
}

/** Serializa una fecha local como `yyyy-MM-dd` para el backend. */
export function toIsoDate(date: Date | null | undefined): string | null {
  if (!date) {
    return null;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
