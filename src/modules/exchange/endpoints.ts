import type { z } from 'zod';
import { addDays } from '@/shared/lib/time';
import {
  aircraftModelSchema,
  airlineSchema,
  airportSchema,
  analyticsParamsSchema,
  analyticsReportSchema,
  analyticsResponseSchema,
  flightDetailsSchema,
  flightIdSchema,
  flightOfferSchema,
  flightSearchParamsSchema,
  itemOf,
  listOf,
  newsItemSchema,
  newsListItemSchema,
  newsParamsSchema,
  newsSlugSchema,
  periodParamsSchema,
  statsSummarySchema,
} from './model';

/**
 * Адрес API — одно описание на всё: по нему маршрут проверяет параметры, собирается
 * спецификация OpenAPI и страница документации `/api/docs` с примерами.
 */
export type ApiEndpoint = {
  id: string;
  /** Путь после `/api/v1` в виде OpenAPI: `/flights/{id}`. */
  path: string;
  tag: string;
  summary: string;
  description: string;
  pathParams?: z.ZodObject;
  query?: z.ZodObject;
  response: z.ZodType;
  /** Сколько секунд ответ можно кэшировать; 0 — не кэшировать. */
  cacheSeconds: number;
  /** Пример параметров для документации и проверок; `today` — сегодняшняя дата по Москве. */
  example: (today: string) => { path?: Record<string, string>; query?: Record<string, string> };
};

const DICTIONARY_CACHE = 600;

export const API_ENDPOINTS = [
  {
    id: 'listAirports',
    path: '/airports',
    tag: 'Справочники',
    summary: 'Аэропорты',
    description: 'Все аэропорты сети: код IATA, город, страна, часовой пояс и координаты.',
    response: listOf(airportSchema),
    cacheSeconds: DICTIONARY_CACHE,
    example: () => ({}),
  },
  {
    id: 'listAirlines',
    path: '/airlines',
    tag: 'Справочники',
    summary: 'Авиакомпании',
    description: 'Авиакомпании сети (выдуманные) и условия перевозки багажа.',
    response: listOf(airlineSchema),
    cacheSeconds: DICTIONARY_CACHE,
    example: () => ({}),
  },
  {
    id: 'listAircraftModels',
    path: '/aircraft-models',
    tag: 'Справочники',
    summary: 'Модели самолётов',
    description: 'Модели самолётов со схемой салона: ряды, расположение кресел и вместимость.',
    response: listOf(aircraftModelSchema),
    cacheSeconds: DICTIONARY_CACHE,
    example: () => ({}),
  },
  {
    id: 'searchFlights',
    path: '/flights',
    tag: 'Рейсы',
    summary: 'Поиск рейсов',
    description:
      'Рейсы в одну сторону на дату, где в выбранном классе хватает мест на всех пассажиров. Уже улетевшие рейсы не показываются.',
    query: flightSearchParamsSchema,
    response: listOf(flightOfferSchema),
    cacheSeconds: 0,
    example: (today) => ({
      query: { from: 'moscow', to: 'KGD', date: addDays(today, 2), passengers: '2' },
    }),
  },
  {
    id: 'getFlight',
    path: '/flights/{id}',
    tag: 'Рейсы',
    summary: 'Рейс',
    description: 'Рейс с ценами обоих классов, числом свободных мест и схемой салона с занятостью.',
    pathParams: flightIdSchema,
    response: itemOf(flightDetailsSchema),
    cacheSeconds: 0,
    example: () => ({ path: { id: '' } }),
  },
  {
    id: 'listNews',
    path: '/news',
    tag: 'Новости',
    summary: 'Новости',
    description: 'Опубликованные новости, свежие сверху.',
    query: newsParamsSchema,
    response: listOf(newsListItemSchema),
    cacheSeconds: 300,
    example: () => ({ query: { source: 'site', pageSize: '5' } }),
  },
  {
    id: 'getNews',
    path: '/news/{slug}',
    tag: 'Новости',
    summary: 'Новость',
    description: 'Одна опубликованная новость с полным текстом.',
    pathParams: newsSlugSchema,
    response: itemOf(newsItemSchema),
    cacheSeconds: 300,
    example: () => ({ path: { slug: 'avocado-travel-otkrylsya' } }),
  },
  {
    id: 'getStatsSummary',
    path: '/stats/summary',
    tag: 'Статистика',
    summary: 'Статистика посещений',
    description:
      'Просмотры и посетители: сегодня, за период (по умолчанию — 30 дней), за всё время, по дням и разделам сайта.',
    query: periodParamsSchema,
    response: itemOf(statsSummarySchema),
    cacheSeconds: 0,
    example: (today) => ({ query: { from: addDays(today, -6), to: today } }),
  },
  {
    id: 'getAnalyticsReport',
    path: '/analytics/{report}',
    tag: 'Аналитика',
    summary: 'Отчёт аналитики',
    description:
      'Данные отчёта со страницы «Аналитика»: те же фильтры, по умолчанию — шесть месяцев. Продажа — оплаченный заказ, дата — день оформления по Москве.',
    pathParams: analyticsReportSchema,
    query: analyticsParamsSchema,
    response: itemOf(analyticsResponseSchema),
    cacheSeconds: 0,
    example: () => ({ path: { report: 'destinations' }, query: { airline: 'KRR' } }),
  },
] as const satisfies readonly ApiEndpoint[];

export type ApiEndpointId = (typeof API_ENDPOINTS)[number]['id'];

export function endpointById(id: ApiEndpointId): ApiEndpoint {
  const endpoint = API_ENDPOINTS.find((item) => item.id === id);
  if (!endpoint) throw new Error(`Нет адреса API ${id}`);
  return endpoint;
}

/** Адрес запроса с подставленными параметрами: `/api/v1/news/{slug}` → `/api/v1/news/abc`. */
export function endpointUrl(
  endpoint: Pick<ApiEndpoint, 'path'>,
  params: { path?: Record<string, string>; query?: Record<string, string> },
): string {
  const path = endpoint.path.replace(/\{(\w+)\}/g, (_, name: string) =>
    encodeURIComponent(params.path?.[name] ?? ''),
  );
  const query = new URLSearchParams(
    Object.entries(params.query ?? {}).filter(([, value]) => value !== ''),
  );
  return `/api/v1${path}${query.size > 0 ? `?${query}` : ''}`;
}
