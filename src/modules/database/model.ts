import { z } from 'zod';

/**
 * Пять видов запросов вкладки «БД» (лаба 3, L3-02): поиск с постраничным выводом, связанные
 * списки, две сводки с агрегатами и графиками и распределение оценок.
 */
export const DB_REPORTS = {
  flights: 'Поиск рейсов',
  routes: 'Авиакомпания и направление',
  airlines: 'Сводка по авиакомпаниям',
  months: 'Динамика продаж',
  ratings: 'Оценки сайта',
} as const;
export type DbReport = keyof typeof DB_REPORTS;
const reportKeys = Object.keys(DB_REPORTS) as [DbReport, ...DbReport[]];

/** Порядок строк в поиске рейсов. */
export const FLIGHT_SORTS = {
  departure: 'Сначала ранние',
  'price-asc': 'Сначала дешёвые',
  'price-desc': 'Сначала дорогие',
  sold: 'Больше всего продано',
} as const;
export type FlightSort = keyof typeof FLIGHT_SORTS;

export const FLIGHTS_PAGE_SIZE = 20;

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);
/** Пустое поле формы — «не ограничивать»: пустая строка превращается в undefined. */
const optional = <T extends z.ZodType>(schema: T) =>
  z
    .preprocess((value) => {
      const text = first(value);
      return typeof text === 'string' && text.trim() === '' ? undefined : text;
    }, schema.optional())
    .catch(undefined);

/**
 * Параметры формы из адреса `/database?report=flights&from=moscow&…`. Непонятное значение
 * не ломает страницу, а просто не применяется. Даты перепутаны местами — меняются.
 */
export const dbQuerySchema = z
  .object({
    report: z.preprocess(first, z.enum(reportKeys)).catch('flights'),
    from: optional(z.string().regex(/^[a-z-]{2,40}$/)),
    to: optional(z.string().regex(/^[a-z-]{2,40}$/)),
    airline: optional(z.string().regex(/^[A-Z0-9]{2,4}$/)),
    dateFrom: optional(z.iso.date()),
    dateTo: optional(z.iso.date()),
    sort: z
      .preprocess(first, z.enum(Object.keys(FLIGHT_SORTS) as [FlightSort, ...FlightSort[]]))
      .catch('departure'),
    page: z.preprocess(first, z.coerce.number().int().min(1).max(10_000)).catch(1),
  })
  .transform((query) =>
    query.dateFrom && query.dateTo && query.dateFrom > query.dateTo
      ? { ...query, dateFrom: query.dateTo, dateTo: query.dateFrom }
      : query,
  );
export type DbQuery = z.output<typeof dbQuerySchema>;

/** Текст запроса, как его выполнила база: SQL с $1, $2 и значения параметров отдельно. */
export type SqlText = { sql: string; params: unknown[] };

export type FlightRow = {
  id: string;
  number: string;
  departsAt: Date;
  origin: string;
  destination: string;
  airline: string;
  aircraft: string;
  priceEconomy: number;
  priceBusiness: number;
  /** Продано мест (действующие билеты). */
  sold: number;
};

export type RouteRow = {
  origin: string;
  destination: string;
  flights: number;
  minPrice: number;
  avgPrice: number;
  maxPrice: number;
  sold: number;
};

export type AirlineRow = {
  airline: string;
  orders: number;
  tickets: number;
  revenue: number;
  averagePrice: number;
  maxPrice: number;
};

export type MonthRow = { month: string; orders: number; tickets: number; revenue: number };

export type RatingRow = { score: number; count: number };

/** Сочетание «авиакомпания — город прилёта», для которого есть рейсы: для связанных списков. */
export type RoutePair = { airline: string; destination: string };

export type DbResult =
  | { report: 'flights'; rows: FlightRow[]; total: number; page: number; totalPages: number }
  | { report: 'routes'; rows: RouteRow[] }
  | { report: 'airlines'; rows: AirlineRow[] }
  | { report: 'months'; rows: MonthRow[] }
  | {
      report: 'ratings';
      rows: RatingRow[];
      summary: { total: number; average: number; min: number; max: number };
    };

/** Паспорт базы (кнопка «О базе данных»): объём, состав, полнота, актуальность. */
export type DbPassport = {
  sizeBytes: number;
  tables: number;
  counts: {
    flights: number;
    orders: number;
    tickets: number;
    airlines: number;
    airports: number;
    news: number;
    forumTopics: number;
    ratings: number;
    pageViews: number;
  };
  /** Полнота: у скольких заказов есть билеты и у скольких оплаченных — дата оплаты. */
  ordersWithTickets: number;
  paidOrders: number;
  paidWithDate: number;
  lastOrderAt: Date | null;
  lastNewsAt: Date | null;
  scheduleFrom: Date | null;
  scheduleTo: Date | null;
};

/** 0..5 оценок — все пять столбцов, даже если за какую-то оценку не голосовали. */
export function fillScores(rows: RatingRow[]): RatingRow[] {
  return [1, 2, 3, 4, 5].map(
    (score) => rows.find((row) => row.score === score) ?? { score, count: 0 },
  );
}

/** Доля в процентах с одним знаком: 3 из 8 → 37,5. */
export function share(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

const KEYWORDS = [
  'from',
  'inner join',
  'left join',
  'where',
  'group by',
  'having',
  'order by',
  'limit',
  'offset',
];

/**
 * SQL от Drizzle — одной строкой. Для показа на странице — каждое предложение с новой строки.
 * Значений в тексте нет (только $1, $2…), поэтому разбивка по ключевым словам безопасна.
 */
export function formatSql(text: string): string {
  const pattern = new RegExp(` (${KEYWORDS.join('|')}) `, 'gi');
  return text.replace(pattern, (_, keyword: string) => `\n${keyword} `);
}

/** Байты → «12,3 МБ». */
export function formatBytes(bytes: number): string {
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ${units[unit]}`;
}

/** Адрес вкладки «БД» с параметрами — только заполненные, report и page — если не по умолчанию. */
export function dbHref(query: Partial<DbQuery> & { report: DbReport }, page?: number): string {
  const params = new URLSearchParams({ report: query.report });
  for (const key of ['from', 'to', 'airline', 'dateFrom', 'dateTo'] as const) {
    const value = query[key];
    if (value) params.set(key, value);
  }
  if (query.report === 'flights' && query.sort && query.sort !== 'departure') {
    params.set('sort', query.sort);
  }
  if (page && page > 1) params.set('page', String(page));
  return `/database?${params}`;
}
