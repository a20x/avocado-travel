import { z } from 'zod';
import { daysBetween } from '@/shared/lib/time';

/**
 * Период по умолчанию — шесть месяцев целиком, включая текущий: с 1-го числа пятого месяца
 * назад по сегодня. Целые месяцы — чтобы первая точка графика выручки не проваливалась.
 */
export const DEFAULT_PERIOD_MONTHS = 6;
/** Отчёты считаются по московскому времени: продажи — российские. */
export const ANALYTICS_TIMEZONE = 'Europe/Moscow';
export const TOP_DESTINATIONS = 10;

const isoDate = z.iso.date();
const optionalParam = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value) || undefined,
    schema.optional(),
  );

/** Фильтры страницы из адреса: `/analytics?from=…&to=…&airline=KRR&destination=sochi`. */
export type AnalyticsFilter = {
  from: string;
  to: string;
  airline?: string;
  destination?: string;
};

const rawFilterSchema = z.object({
  from: optionalParam(isoDate).catch(undefined),
  to: optionalParam(isoDate).catch(undefined),
  airline: optionalParam(z.string().regex(/^[A-Z]{3}$/)).catch(undefined),
  destination: optionalParam(z.string().regex(/^[a-z]+(-[a-z]+)*$/)).catch(undefined),
});

/** Первое число месяца, отстоящего от даты на `monthsBack` месяцев назад. */
function monthStart(date: string, monthsBack: number): string {
  const [year, month] = date.split('-').map(Number) as [number, number];
  const index = year * 12 + (month - 1) - monthsBack;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}-01`;
}

/**
 * Фильтры из параметров адреса. Непонятное значение не ломает страницу: вместо него —
 * значение по умолчанию. Период — не позже сегодняшнего дня; «с» позже «по» — меняются местами.
 */
export function parseAnalyticsFilter(
  params: Record<string, unknown>,
  today: string,
): AnalyticsFilter {
  const raw = rawFilterSchema.parse(params);
  let to = raw.to && raw.to <= today ? raw.to : today;
  let from = raw.from ?? monthStart(to, DEFAULT_PERIOD_MONTHS - 1);
  if (from > to) [from, to] = [to, from];
  return { from, to, airline: raw.airline, destination: raw.destination };
}

/** Дней в периоде, включая оба конца. */
export function periodDays(filter: Pick<AnalyticsFilter, 'from' | 'to'>): number {
  return daysBetween(filter.from, filter.to) + 1;
}

/** Все месяцы периода по порядку: `2026-04`, `2026-05`, … */
export function monthsOf(filter: Pick<AnalyticsFilter, 'from' | 'to'>): string[] {
  const months: string[] = [];
  let [year, month] = filter.from.split('-').map(Number) as [number, number];
  const last = filter.to.slice(0, 7);
  for (;;) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    months.push(key);
    if (key >= last) return months;
    month += 1;
    if (month > 12) [year, month] = [year + 1, 1];
  }
}

const monthName = new Intl.DateTimeFormat('ru-RU', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** `2026-07` → «июль 2026». */
export function monthLabel(month: string): string {
  return monthName.format(new Date(`${month}-15T12:00:00Z`)).replace(/\s*г\.$/, '');
}

const monthShort = new Intl.DateTimeFormat('ru-RU', { month: 'short', timeZone: 'UTC' });

/** `2026-07` → «июль»: подпись на оси графика. */
export function monthShortLabel(month: string): string {
  return monthShort.format(new Date(`${month}-15T12:00:00Z`)).replace(/\.$/, '');
}

export type MonthRevenue = {
  month: string;
  label: string;
  short: string;
  revenue: number;
  orders: number;
};

/** Выручка по каждому месяцу периода: месяцы без продаж — нулями, а не пропуском на графике. */
export function fillMonths(
  filter: Pick<AnalyticsFilter, 'from' | 'to'>,
  rows: Array<{ month: string; revenue: number; orders: number }>,
): MonthRevenue[] {
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  return monthsOf(filter).map((month) => ({
    month,
    label: monthLabel(month),
    short: monthShortLabel(month),
    revenue: byMonth.get(month)?.revenue ?? 0,
    orders: byMonth.get(month)?.orders ?? 0,
  }));
}

/** Доля в процентах с одним знаком: 0,0 при пустом знаменателе. */
export function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

export type Occupancy = {
  label: string;
  flights: number;
  seats: number;
  sold: number;
  percent: number;
};

/**
 * Заполняемость (L3, отчёт 3): проданные места / все места улетевших рейсов, по группам.
 * Строки репозитория — по паре «авиакомпания + модель», вместимость модели считается
 * по её схеме салона. Сортировка — от самой заполненной группы.
 */
export function occupancyBy<T extends { flights: number; sold: number; seatsPerFlight: number }>(
  rows: T[],
  label: (row: T) => string,
): Occupancy[] {
  const groups = new Map<string, Omit<Occupancy, 'percent'>>();
  for (const row of rows) {
    const key = label(row);
    const group = groups.get(key) ?? { label: key, flights: 0, seats: 0, sold: 0 };
    group.flights += row.flights;
    group.seats += row.flights * row.seatsPerFlight;
    group.sold += row.sold;
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({ ...group, percent: percent(group.sold, group.seats) }))
    .sort((a, b) => b.percent - a.percent || a.label.localeCompare(b.label, 'ru'));
}

export type Share = { key: string; label: string; value: number; percent: number };

/** Части целого с процентами, в сумме ровно 100 (остаток округления — у самой большой части). */
export function sharesOf(parts: Array<{ key: string; label: string; value: number }>): Share[] {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  const shares = parts.map((part) => ({ ...part, percent: percent(part.value, total) }));
  if (total === 0) return shares;
  const diff = Math.round((100 - shares.reduce((sum, share) => sum + share.percent, 0)) * 10) / 10;
  const largest = shares.reduce((max, share) => (share.value > max.value ? share : max));
  largest.percent = Math.round((largest.percent + diff) * 10) / 10;
  return shares;
}

/** Итоги продаж: количество, сумма, средний и максимальный чек (L3-04). Деньги — копейки. */
export type SalesTotals = {
  orders: number;
  tickets: number;
  revenue: number;
  averageCheck: number;
  maxCheck: number;
};

export type RouteSales = SalesTotals & { origin: string; destination: string };

export type AnalyticsReport = {
  filter: AnalyticsFilter;
  totals: SalesTotals & { cancelled: number; cancelShare: number };
  revenueByMonth: MonthRevenue[];
  topDestinations: Array<{ label: string; tickets: number }>;
  occupancyByAirline: Occupancy[];
  occupancyByModel: Occupancy[];
  classShares: Share[];
  statusShares: Share[];
  routes: RouteSales[];
};

const compactRub = new Intl.NumberFormat('ru-RU', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Сумма для подписей осей: копейки → «1,2 млн ₽». */
export function formatRubCompact(kopecks: number): string {
  return `${compactRub.format(kopecks / 100)} ₽`;
}
