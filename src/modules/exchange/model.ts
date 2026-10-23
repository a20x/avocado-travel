import { z } from 'zod';

/**
 * Схемы публичного API (docs/05-api.md). По схемам параметров API проверяет запросы,
 * по схемам ответов — описывает их в OpenAPI; сквозные тесты сверяют с ними настоящие ответы.
 */

export const API_BASE = '/api/v1';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
/** Ограничение частоты: столько запросов в минуту с одного IP. */
export const API_RATE_LIMIT = { limit: 60, windowMs: 60_000 };

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SAME_CITY'
  | 'UNKNOWN_PLACE'
  | 'DATE_OUT_OF_RANGE';

export const errorSchema = z
  .object({
    error: z.object({
      code: z.string().meta({ example: 'VALIDATION_ERROR' }),
      message: z.string().meta({ example: 'Параметр date: дата в формате ГГГГ-ММ-ДД' }),
    }),
  })
  .meta({ id: 'Error', description: 'Ошибка: код для программ и сообщение для людей' });

/* Параметры */

const date = (description: string) =>
  z.iso.date({ error: 'дата в формате ГГГГ-ММ-ДД' }).meta({ description, example: '2026-11-14' });

/** Номер страницы и её размер — общие для списков. */
export const pagingSchema = z.object({
  page: z.coerce
    .number({ error: 'целое число от 1' })
    .int({ error: 'целое число от 1' })
    .min(1, { error: 'целое число от 1' })
    .default(1)
    .meta({ description: 'Номер страницы, с 1' }),
  pageSize: z.coerce
    .number({ error: `целое число от 1 до ${MAX_PAGE_SIZE}` })
    .int({ error: `целое число от 1 до ${MAX_PAGE_SIZE}` })
    .min(1, { error: `целое число от 1 до ${MAX_PAGE_SIZE}` })
    .max(MAX_PAGE_SIZE, { error: `целое число от 1 до ${MAX_PAGE_SIZE}` })
    .default(DEFAULT_PAGE_SIZE)
    .meta({ description: `Сколько записей на странице, до ${MAX_PAGE_SIZE}` }),
});

const place = (description: string, example: string) =>
  z
    .string()
    .regex(/^([A-Z]{3}|[a-z]+(-[a-z]+)*)$/, {
      error: 'IATA-код аэропорта (SVO) или код города (moscow)',
    })
    .meta({ description, example });

export const flightSearchParamsSchema = pagingSchema.extend({
  from: place('Откуда: IATA-код аэропорта или код города', 'moscow'),
  to: place('Куда: IATA-код аэропорта или код города', 'KGD'),
  date: date('Дата вылета по местному времени города вылета, от сегодня до 60 дней вперёд'),
  passengers: z.coerce
    .number({ error: 'целое число от 1 до 6' })
    .int({ error: 'целое число от 1 до 6' })
    .min(1, { error: 'целое число от 1 до 6' })
    .max(6, { error: 'целое число от 1 до 6' })
    .default(1)
    .meta({ description: 'Пассажиров: на рейсе должно хватать свободных мест на всех' }),
  class: z
    .enum(['economy', 'business'], { error: 'economy или business' })
    .default('economy')
    .meta({ description: 'Класс обслуживания' }),
  sort: z
    .enum(['price', 'departure', 'duration'], { error: 'price, departure или duration' })
    .default('price')
    .meta({ description: 'Сортировка: по цене, времени вылета или длительности' }),
});
export type FlightSearchParams = z.infer<typeof flightSearchParamsSchema>;

export const flightIdSchema = z.object({
  id: z.uuid({ error: 'идентификатор рейса (UUID)' }).meta({ description: 'Идентификатор рейса' }),
});

export const newsParamsSchema = pagingSchema.extend({
  source: z
    .enum(['site', 'external'], { error: 'site или external' })
    .optional()
    .meta({ description: 'Свои новости (site) или новости отрасли из внешних лент (external)' }),
  category: z
    .string()
    .regex(/^[a-z-]+$/, { error: 'код рубрики латиницей' })
    .optional()
    .meta({ description: 'Рубрика: company, routes, promo, service', example: 'routes' }),
});
export type NewsParams = z.infer<typeof newsParamsSchema>;

export const newsSlugSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { error: 'адрес новости латиницей через дефис' })
    .meta({ description: 'Адрес новости', example: 'avocado-travel-otkrylsya' }),
});

export const periodParamsSchema = z.object({
  from: date('Начало периода (по Москве)').optional(),
  to: date('Конец периода включительно (по Москве)').optional(),
});

export const ANALYTICS_REPORTS = [
  'revenue',
  'destinations',
  'occupancy',
  'structure',
  'routes',
] as const;
export type AnalyticsReportName = (typeof ANALYTICS_REPORTS)[number];

export const analyticsReportSchema = z.object({
  report: z.enum(ANALYTICS_REPORTS, { error: ANALYTICS_REPORTS.join(', ') }).meta({
    description:
      'Отчёт: revenue — выручка по месяцам, destinations — топ-10 направлений, occupancy — заполняемость, structure — структура продаж, routes — продажи по маршрутам',
    example: 'revenue',
  }),
});

export const analyticsParamsSchema = periodParamsSchema.extend({
  airline: z
    .string()
    .regex(/^[A-Z]{3}$/, { error: 'код авиакомпании из трёх заглавных букв' })
    .optional()
    .meta({ description: 'Код авиакомпании', example: 'KRR' }),
  destination: z
    .string()
    .regex(/^[a-z]+(-[a-z]+)*$/, { error: 'код города латиницей' })
    .optional()
    .meta({ description: 'Город прилёта', example: 'sochi' }),
});

/* Ответы */

const kopecks = (description: string) =>
  z
    .number()
    .int()
    .meta({ description: `${description}, копейки` });
const dateTime = (description: string) => z.iso.datetime().meta({ description });

export const airportSchema = z
  .object({
    iata: z.string().meta({ example: 'SVO' }),
    name: z.string().meta({ example: 'Шереметьево' }),
    city: z.string().meta({ example: 'Москва' }),
    citySlug: z.string().meta({ example: 'moscow' }),
    country: z.string(),
    timezone: z.string().meta({ example: 'Europe/Moscow' }),
    lat: z.number(),
    lon: z.number(),
  })
  .meta({ id: 'Airport' });

export const airlineSchema = z
  .object({
    code: z.string().meta({ example: 'KRR', description: 'Код авиакомпании (выдуманный)' }),
    name: z.string().meta({ example: 'Кирра' }),
    description: z.string(),
    color: z.string().meta({ example: '#3B78A0' }),
    logo: z.string().meta({ description: 'Адрес логотипа на сайте' }),
    baggageIncluded: z.boolean().meta({ description: 'Багаж включён в тариф эконома' }),
  })
  .meta({ id: 'Airline' });

export const aircraftModelSchema = z
  .object({
    id: z.number().int(),
    manufacturer: z.string().meta({ example: 'Airbus' }),
    model: z.string().meta({ example: 'A320neo' }),
    businessRows: z.number().int(),
    businessLayout: z
      .string()
      .meta({ example: 'AC-DF', description: 'Буквы кресел, «-» — проход' }),
    economyRows: z.number().int(),
    economyLayout: z.string().meta({ example: 'ABC-DEF' }),
    seats: z.object({ business: z.number().int(), economy: z.number().int() }),
  })
  .meta({ id: 'AircraftModel' });

const placeInfo = z.object({
  iata: z.string(),
  name: z.string(),
  city: z.string(),
  citySlug: z.string(),
  timezone: z.string(),
});

const flightBase = {
  id: z.uuid(),
  number: z.string().meta({ example: 'KRR 5012' }),
  airline: z.object({ code: z.string(), name: z.string(), baggageIncluded: z.boolean() }),
  aircraft: z.object({ manufacturer: z.string(), model: z.string() }),
  origin: placeInfo,
  destination: placeInfo,
  departsAt: dateTime('Вылет, UTC'),
  arrivesAt: dateTime('Прилёт, UTC'),
  durationMinutes: z.number().int(),
};

export const flightOfferSchema = z
  .object({
    ...flightBase,
    cabinClass: z.enum(['economy', 'business']),
    price: kopecks('Цена за одного пассажира в выбранном классе'),
    currency: z.literal('RUB'),
    seatsLeft: z.number().int().meta({ description: 'Свободных мест в выбранном классе' }),
  })
  .meta({ id: 'FlightOffer' });

export const flightDetailsSchema = z
  .object({
    ...flightBase,
    prices: z.object({ economy: kopecks('Эконом'), business: kopecks('Бизнес') }),
    currency: z.literal('RUB'),
    seatsLeft: z.object({ economy: z.number().int(), business: z.number().int() }),
    isDeparted: z.boolean().meta({ description: 'Рейс уже улетел — места не продаются' }),
    seatMap: z
      .array(
        z.object({
          row: z.number().int(),
          cabinClass: z.enum(['economy', 'business']),
          extraLegroom: z.boolean(),
          seats: z.array(
            z.object({
              id: z.string().meta({ example: '12C' }),
              taken: z.boolean(),
              price: kopecks('Цена кресла с доплатой за место для ног'),
            }),
          ),
        }),
      )
      .meta({ description: 'Схема салона по рядам' }),
  })
  .meta({ id: 'FlightDetails' });

export const newsListItemSchema = z
  .object({
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    category: z.string(),
    source: z.enum(['site', 'external']),
    publishedAt: dateTime('Дата публикации, UTC'),
    url: z.string().meta({ description: 'Страница новости на сайте' }),
  })
  .meta({ id: 'NewsListItem' });

export const newsItemSchema = newsListItemSchema
  .extend({
    body: z.string().meta({ description: 'Текст: обычный, абзацы разделены пустой строкой' }),
    tags: z.array(z.string()),
    externalUrl: z.string().nullable().meta({ description: 'Оригинал — у новостей отрасли' }),
  })
  .meta({ id: 'NewsItem' });

const totals = z.object({ views: z.number().int(), visitors: z.number().int() });

export const statsSummarySchema = z
  .object({
    period: z.object({ from: z.iso.date(), to: z.iso.date() }),
    today: totals,
    inPeriod: totals,
    allTime: totals,
    byDay: z.array(totals.extend({ date: z.iso.date() })),
    bySection: z.array(totals.extend({ section: z.string() })),
  })
  .meta({
    id: 'StatsSummary',
    description: 'Просмотры и уникальные посетители (пара «хэш IP + день»)',
  });

const filterSchema = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
  airline: z.string().optional(),
  destination: z.string().optional(),
});
const occupancy = z.object({
  label: z.string(),
  flights: z.number().int(),
  seats: z.number().int(),
  sold: z.number().int(),
  percent: z.number(),
});
const share = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number().int(),
  percent: z.number(),
});
const salesTotals = {
  orders: z.number().int(),
  tickets: z.number().int(),
  revenue: kopecks('Выручка'),
  averageCheck: kopecks('Средний чек'),
  maxCheck: kopecks('Максимальный чек'),
};

export const analyticsResponseSchema = z
  .discriminatedUnion('report', [
    z.object({
      report: z.literal('revenue'),
      filter: filterSchema,
      rows: z.array(
        z.object({
          month: z.string().meta({ example: '2026-07' }),
          label: z.string(),
          revenue: kopecks('Выручка'),
          orders: z.number().int(),
        }),
      ),
    }),
    z.object({
      report: z.literal('destinations'),
      filter: filterSchema,
      rows: z.array(z.object({ label: z.string(), tickets: z.number().int() })),
    }),
    z.object({
      report: z.literal('occupancy'),
      filter: filterSchema,
      byAirline: z.array(occupancy),
      byModel: z.array(occupancy),
    }),
    z.object({
      report: z.literal('structure'),
      filter: filterSchema,
      classes: z.array(share),
      orders: z.array(share),
    }),
    z.object({
      report: z.literal('routes'),
      filter: filterSchema,
      rows: z.array(z.object({ origin: z.string(), destination: z.string(), ...salesTotals })),
      totals: z.object(salesTotals),
    }),
  ])
  .meta({ id: 'AnalyticsReport' });

/** Обёртки ответов: список с `meta` и один объект. */
export const listOf = <T extends z.ZodType>(item: T) =>
  z.object({
    data: z.array(item),
    meta: z.object({
      total: z.number().int(),
      page: z.number().int().optional(),
      pageSize: z.number().int().optional(),
    }),
  });
export const itemOf = <T extends z.ZodType>(item: T) => z.object({ data: item });

/** Срез списка для страницы и `meta` к нему. */
export function paginate<T>(items: T[], paging: { page: number; pageSize: number }) {
  const start = (paging.page - 1) * paging.pageSize;
  return {
    data: items.slice(start, start + paging.pageSize),
    meta: { page: paging.page, pageSize: paging.pageSize, total: items.length },
  };
}

/** Первая ошибка проверки параметров — понятным сообщением: «Параметр date: …». */
export function validationMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Неверные параметры';
  const name = issue.path.join('.');
  return name ? `Параметр ${name}: ${issue.message}` : issue.message;
}
