import { z } from 'zod';
import type { DaySpan } from '@/shared/lib/available-days';
import { SLUG_PATTERN } from '@/shared/lib/slug';

/**
 * Запросы вкладки «БД» (лаба 3, L3-02): поиск по одному атрибуту, по двум связанным, сводки
 * с агрегатами и графиками, распределение оценок и поиск рейсов по нескольким условиям.
 */
export const DB_REPORTS = {
  airline: 'Рейсы авиакомпании',
  routes: 'Авиакомпания и направление',
  countryCity: 'Страна и город',
  partZone: 'Часть света и часовой пояс',
  countryAirline: 'Страна и авиакомпания',
  typeAirline: 'Тип и авиакомпания',
  schedule: 'Рейсы по авиакомпаниям',
  airlines: 'Продажи по авиакомпаниям',
  months: 'Динамика продаж',
  ratings: 'Оценки сайта',
  flights: 'Поиск рейсов',
} as const;
export type DbReport = keyof typeof DB_REPORTS;

/** Что показывает вкладка: запрос или один из разделов без запроса — ввод и сведения о базе. */
export type DbView = DbReport | 'input' | 'about';
const viewKeys = ['input', 'about', ...Object.keys(DB_REPORTS)] as [DbView, ...DbView[]];

/**
 * Меню вкладки — словами преподавателя, чтобы разделы находились сразу. У раздела один или
 * несколько видов; первый открывается по пункту меню. «Агрегация» объединяет четыре сводки,
 * первая — рейсы по авиакомпаниям: её числа растут сразу после ввода рейсов. «Поиск по двум
 * атрибутам» — по рейсам и по справочникам: там новые значения видны сразу после сохранения.
 */
export const DB_SECTIONS = [
  { label: 'Ввод', views: ['input'] },
  { label: 'Поиск по одному атрибуту', views: ['airline'] },
  {
    label: 'Поиск по двум атрибутам',
    viewsLabel: 'Вид поиска',
    views: ['routes', 'countryCity', 'partZone', 'countryAirline', 'typeAirline'],
  },
  {
    label: 'Агрегация',
    viewsLabel: 'Вид агрегации',
    views: ['schedule', 'airlines', 'months', 'ratings'],
  },
  { label: 'Сведения о БД', views: ['about'] },
  { label: 'Поиск рейсов', views: ['flights'] },
] as const satisfies ReadonlyArray<{
  label: string;
  viewsLabel?: string;
  views: readonly DbView[];
}>;
export type DbSection = (typeof DB_SECTIONS)[number];

/** Раздел меню, к которому относится вид. */
export function sectionOf(view: DbView): DbSection {
  return DB_SECTIONS.find((section) => (section.views as readonly DbView[]).includes(view))!;
}

/** Адрес раздела — его первый вид. */
export const sectionHref = (section: DbSection) => `/database?report=${section.views[0]}`;

export const isReport = (view: DbView): view is DbReport => view in DB_REPORTS;

/** Подпись и пункт «без условия» полей поиска по справочникам. */
export const DIRECTORY_FIELDS = {
  country: { label: 'Страна', anyLabel: 'Все страны' },
  city: { label: 'Город', anyLabel: 'Все города' },
  part: { label: 'Часть света', anyLabel: 'Все части света' },
  zone: { label: 'Часовой пояс', anyLabel: 'Все часовые пояса' },
  airline: { label: 'Авиакомпания', anyLabel: 'Все авиакомпании' },
  type: { label: 'Тип авиакомпании', anyLabel: 'Все типы' },
} as const;
export type DirectoryField = keyof typeof DIRECTORY_FIELDS;

/**
 * Поиск по двум атрибутам в справочниках (ADR-0013): списки строятся из самих городов и
 * авиакомпаний, а не из рейсов, поэтому новый город или авиакомпания видны сразу, ещё без рейсов.
 */
export const DIRECTORY_REPORTS = {
  countryCity: { source: 'cities', fields: ['country', 'city'] },
  partZone: { source: 'cities', fields: ['part', 'zone'] },
  countryAirline: { source: 'airlines', fields: ['country', 'airline'] },
  typeAirline: { source: 'airlines', fields: ['type', 'airline'] },
} as const satisfies Record<
  string,
  { source: 'cities' | 'airlines'; fields: readonly [DirectoryField, DirectoryField] }
>;
export type DirectoryReport = keyof typeof DIRECTORY_REPORTS;
export const isDirectoryReport = (report: string): report is DirectoryReport =>
  report in DIRECTORY_REPORTS;

/** Списки поиска по справочникам: сочетания для связи и варианты каждого поля по алфавиту. */
export type DirectoryChoices = {
  combos: Array<Record<string, string>>;
  options: Record<string, Array<{ value: string; label: string }>>;
};

/**
 * Из строк справочника — списки двух полей, без повторов и по алфавиту (по-русски). `names` —
 * названия для полей, где значение — адрес или код: «moscow» → «Москва», «LST» → «Ластавиа».
 */
export function directoryChoices(
  rows: Array<Partial<Record<DirectoryField, string>>>,
  fields: readonly DirectoryField[],
  names: Record<string, string>,
): DirectoryChoices {
  const combos = new Map<string, Record<string, string>>();
  const options: DirectoryChoices['options'] = {};
  for (const field of fields) {
    const values = [...new Set(rows.flatMap((row) => row[field] ?? []))];
    options[field] = values
      .map((value) => ({ value, label: names[value] ?? value }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  }
  for (const row of rows) {
    const combo = Object.fromEntries(fields.map((field) => [field, row[field] ?? '']));
    combos.set(JSON.stringify(combo), combo);
  }
  return { combos: [...combos.values()], options };
}

/** Строка результата поиска по справочнику городов. */
export type DirectoryCityRow = {
  city: string;
  country: string;
  part: string;
  airports: string;
  zones: string;
};

/** Строка результата поиска по справочнику авиакомпаний. */
export type DirectoryAirlineRow = {
  airline: string;
  code: string;
  country: string;
  type: string;
  baseCity: string;
  baggageIncluded: boolean;
};

/** Авиакомпания из таблицы рейсов — вариант списка «Поиска по одному атрибуту». */
export type AirlineOption = { code: string; name: string };

/**
 * Варианты по алфавиту (по-русски), без повторов, и выбранный: запрошенный, если он в списке,
 * иначе первый. Так у поиска по одному атрибуту всегда есть выбор и результат.
 */
export function pickAirline(
  options: AirlineOption[],
  wanted: string | undefined,
): { options: AirlineOption[]; selected: string | undefined } {
  const unique = [...new Map(options.map((option) => [option.code, option])).values()].sort(
    (a, b) => a.name.localeCompare(b.name, 'ru'),
  );
  const selected = unique.some((option) => option.code === wanted) ? wanted : unique[0]?.code;
  return { options: unique, selected };
}

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
    report: z.preprocess(first, z.enum(viewKeys)).catch('airline'),
    from: optional(z.string().regex(SLUG_PATTERN)),
    to: optional(z.string().regex(SLUG_PATTERN)),
    airline: optional(z.string().regex(/^[A-Z0-9]{2,4}$/)),
    // Поиск по справочникам: значения списков уходят в базу параметрами запроса.
    country: optional(z.string().max(80)),
    city: optional(z.string().regex(SLUG_PATTERN)),
    part: optional(z.string().max(80)),
    zone: optional(z.string().max(80)),
    type: optional(z.string().max(80)),
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

/** Рейсы авиакомпании: всего, предстоящие, маршруты и цены эконома. Без рейсов — нули. */
export type ScheduleRow = {
  airline: string;
  flights: number;
  upcoming: number;
  routes: number;
  minPrice: number;
  avgPrice: number;
  maxPrice: number;
};

/**
 * Строка «Итого» для рейсов по авиакомпаниям: суммы рейсов и маршрутов, самая низкая и самая
 * высокая цена и средняя по всем рейсам (средние авиакомпаний — с весом числа их рейсов).
 */
export function scheduleTotal(rows: ScheduleRow[]): Omit<ScheduleRow, 'airline'> {
  const withFlights = rows.filter((row) => row.flights > 0);
  const flights = withFlights.reduce((total, row) => total + row.flights, 0);
  return {
    flights,
    upcoming: rows.reduce((total, row) => total + row.upcoming, 0),
    routes: rows.reduce((total, row) => total + row.routes, 0),
    minPrice: withFlights.length ? Math.min(...withFlights.map((row) => row.minPrice)) : 0,
    avgPrice: flights
      ? Math.round(
          withFlights.reduce((total, row) => total + row.avgPrice * row.flights, 0) / flights,
        )
      : 0,
    maxPrice: withFlights.length ? Math.max(...withFlights.map((row) => row.maxPrice)) : 0,
  };
}

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

/**
 * Сочетание «откуда — куда — авиакомпания», для которого в базе есть рейсы, с датами этих рейсов
 * (по Москве): из таких сочетаний строятся связанные списки и подсказка о датах.
 */
export type FlightCombo = { from: string; to: string; airline: string } & DaySpan;

/** Найденные рейсы одной страницы. */
type FlightPage = {
  rows: FlightRow[];
  total: number;
  page: number;
  totalPages: number;
};

export type DbResult =
  | ({
      report: 'airline';
      /** Авиакомпании, у которых есть рейсы с сегодняшнего дня, — варианты списка. */
      airlines: AirlineOption[];
      /** Выбранная авиакомпания; нет — только если рейсов в базе нет совсем. */
      airline: string | undefined;
    } & FlightPage)
  | ({
      report: 'flights';
      /** Ничего не нашлось в выбранные даты — ближайшие даты с рейсами по тем же условиям. */
      nearestDates: string[];
    } & FlightPage)
  | { report: 'routes'; rows: RouteRow[] }
  | {
      report: 'countryCity' | 'partZone';
      rows: DirectoryCityRow[];
      choices: DirectoryChoices;
    }
  | {
      report: 'countryAirline' | 'typeAirline';
      rows: DirectoryAirlineRow[];
      choices: DirectoryChoices;
    }
  | { report: 'schedule'; rows: ScheduleRow[] }
  | {
      report: 'airlines';
      rows: AirlineRow[];
      /** Период продаж — для ссылки «Показать весь период с продажами» при пустом результате. */
      period: { first: string; last: string } | null;
    }
  | { report: 'months'; rows: MonthRow[]; period: { first: string; last: string } | null }
  | {
      report: 'ratings';
      rows: RatingRow[];
      summary: { total: number; average: number; min: number; max: number };
    };

/** Паспорт базы (раздел «Сведения о БД»): объём, состав, полнота, актуальность. */
export type DbPassport = {
  sizeBytes: number;
  tables: number;
  counts: {
    flights: number;
    orders: number;
    tickets: number;
    airlines: number;
    cities: number;
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
export function dbHref(query: Partial<DbQuery> & { report: DbView }, page?: number): string {
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

/** Первый и последний день продаж авиакомпании (по Москве) — границы календаря в сводках. */
export type SalesSpan = { airline: string; first: string; last: string };

/**
 * Период продаж: по одной авиакомпании или по всем. Нет продаж — null (тогда даты не
 * ограничиваются). Дни — `YYYY-MM-DD`, их можно сравнивать как строки.
 */
export function salesPeriod(
  spans: SalesSpan[],
  airline?: string,
): { first: string; last: string } | null {
  const chosen = airline ? spans.filter((span) => span.airline === airline) : spans;
  if (chosen.length === 0) return null;
  return {
    first: chosen.reduce((min, span) => (span.first < min ? span.first : min), chosen[0]!.first),
    last: chosen.reduce((max, span) => (span.last > max ? span.last : max), chosen[0]!.last),
  };
}

/**
 * Даты сводки подтягиваются к периоду продаж: раньше первого дня — первый день, позже
 * последнего — последний. Период целиком вне продаж становится их крайним днём, а в крайние
 * дни продажи есть всегда — пустого результата из-за дат вне периода не бывает.
 */
export function clampToSales<T extends { dateFrom?: string; dateTo?: string }>(
  query: T,
  period: { first: string; last: string } | null,
): T {
  if (!period) return query;
  const clamp = (date?: string) =>
    date === undefined
      ? undefined
      : date < period.first
        ? period.first
        : date > period.last
          ? period.last
          : date;
  return { ...query, dateFrom: clamp(query.dateFrom), dateTo: clamp(query.dateTo) };
}
