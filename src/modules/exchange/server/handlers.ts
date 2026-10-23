import 'server-only';
import type { z } from 'zod';
import { getAnalytics } from '@/modules/analytics/server';
import { seatCapacity } from '@/modules/catalog-data';
import { listAircraftModels, listAirlines, listAirports } from '@/modules/catalog-data/server';
import type { FlightOffer } from '@/modules/flights';
import { getFlight, listSchedule, searchFlights } from '@/modules/flights/server';
import { getNews, listLatestNews, listPublishedNews } from '@/modules/news/server';
import { getReport } from '@/modules/stats/server';
import { SITE_URL } from '@/shared/config/site';
import { toCsv, toJsonRows, type ExportTable } from '../csv';
import type { API_ENDPOINTS, ApiEndpointId } from '../endpoints';
import { analyticsTable, exportFilename, newsTable, scheduleTable } from '../exports';
import { paginate, type ApiErrorCode } from '../model';

export type ApiFile = { content: string; contentType: string; filename: string };
export type ApiResult =
  | { ok: true; body: unknown }
  | { ok: true; file: ApiFile }
  | { ok: false; code: ApiErrorCode; message: string };

type EndpointOf<K extends ApiEndpointId> = Extract<(typeof API_ENDPOINTS)[number], { id: K }>;
type Parsed<T> = T extends z.ZodType ? z.infer<T> : Record<string, never>;
type Input<K extends ApiEndpointId> = {
  path: Parsed<EndpointOf<K> extends { pathParams: infer P } ? P : undefined>;
  query: Parsed<EndpointOf<K> extends { query: infer Q } ? Q : undefined>;
};

const ok = (body: unknown): ApiResult => ({ ok: true, body });
const fail = (code: ApiErrorCode, message: string): ApiResult => ({ ok: false, code, message });
const list = <T>(items: T[]) => ok({ data: items, meta: { total: items.length } });

/** Выгрузка файлом: CSV для Excel или JSON-массив строк. */
function file(
  table: ExportTable,
  format: 'csv' | 'json',
  name: Array<string | undefined>,
): ApiResult {
  return {
    ok: true,
    file:
      format === 'csv'
        ? {
            content: toCsv(table),
            contentType: 'text/csv; charset=utf-8',
            filename: exportFilename(name, 'csv'),
          }
        : {
            content: `${JSON.stringify(toJsonRows(table), null, 2)}\n`,
            contentType: 'application/json; charset=utf-8',
            filename: exportFilename(name, 'json'),
          },
  };
}

/** Подходит ли место рейса под фильтр: код аэропорта — точное совпадение, иначе — город. */
const matchesPlace = (filter: string | undefined, info: { iata: string; citySlug: string }) =>
  !filter || info.iata === filter || info.citySlug === filter;

/** Место из параметра: IATA-код аэропорта → его город и сам аэропорт, иначе — код города. */
async function resolvePlace(value: string): Promise<{ city: string; iata?: string } | null> {
  if (!/^[A-Z]{3}$/.test(value)) return { city: value };
  const airport = (await listAirports()).find((item) => item.iata === value);
  return airport ? { city: airport.citySlug, iata: airport.iata } : null;
}

const place = (info: FlightOffer['origin']) => ({
  iata: info.iata,
  name: info.name,
  city: info.city,
  citySlug: info.citySlug,
  timezone: info.timezone,
});

const flightBase = (flight: Omit<FlightOffer, 'cabinClass' | 'price' | 'seatsLeft'>) => ({
  id: flight.id,
  number: flight.number,
  airline: {
    code: flight.airline.code,
    name: flight.airline.name,
    baggageIncluded: flight.airline.baggageIncluded,
  },
  aircraft: flight.aircraft,
  origin: place(flight.origin),
  destination: place(flight.destination),
  departsAt: flight.departsAt,
  arrivesAt: flight.arrivesAt,
  durationMinutes: flight.durationMinutes,
});

const SEARCH_ERRORS = {
  INVALID_QUERY: ['VALIDATION_ERROR', 'Неверные параметры поиска'],
  SAME_CITY: ['SAME_CITY', 'Города вылета и прилёта совпадают'],
  UNKNOWN_CITY: ['UNKNOWN_PLACE', 'Такого города нет в сети маршрутов'],
  DATE_OUT_OF_RANGE: ['DATE_OUT_OF_RANGE', 'Дата вылета — от сегодня до 60 дней вперёд'],
} as const;

/**
 * Обработчики адресов API: параметры уже проверены схемами, здесь — вызов сервисов модулей
 * и перевод их данных в формат API. Своих правил у API нет.
 */
export const HANDLERS: {
  [K in ApiEndpointId]: (input: Input<K>, now: Date) => Promise<ApiResult>;
} = {
  listAirports: async () =>
    list(
      (await listAirports()).map(({ iata, name, city, citySlug, country, timezone, lat, lon }) => ({
        iata,
        name,
        city,
        citySlug,
        country,
        timezone,
        lat,
        lon,
      })),
    ),

  listAirlines: async () =>
    list(
      (await listAirlines()).map(({ code, name, description, color, logo, baggageIncluded }) => ({
        code,
        name,
        description,
        color,
        logo,
        baggageIncluded,
      })),
    ),

  listAircraftModels: async () =>
    list((await listAircraftModels()).map((model) => ({ ...model, seats: seatCapacity(model) }))),

  searchFlights: async ({ query }, now) => {
    const [from, to] = await Promise.all([resolvePlace(query.from), resolvePlace(query.to)]);
    if (!from || !to) return fail('UNKNOWN_PLACE', 'Такого аэропорта нет в сети маршрутов');
    const result = await searchFlights(
      {
        from: from.city,
        to: to.city,
        date: query.date,
        passengers: query.passengers,
        cabinClass: query.class,
        sort: query.sort,
      },
      now,
    );
    if (!result.ok) {
      const [code, message] = SEARCH_ERRORS[result.error];
      return fail(code, message);
    }
    const offers = result.data.offers
      .filter((offer) => !from.iata || offer.origin.iata === from.iata)
      .filter((offer) => !to.iata || offer.destination.iata === to.iata)
      .map((offer) => ({
        ...flightBase(offer),
        cabinClass: offer.cabinClass,
        price: offer.price,
        currency: 'RUB',
        seatsLeft: offer.seatsLeft,
      }));
    return ok(paginate(offers, query));
  },

  getFlight: async ({ path }, now) => {
    const result = await getFlight(path.id, now);
    if (!result.ok) return fail('NOT_FOUND', 'Рейс не найден');
    const flight = result.data;
    return ok({
      data: {
        ...flightBase(flight),
        prices: flight.prices,
        currency: 'RUB',
        seatsLeft: flight.seatsLeft,
        isDeparted: flight.isDeparted,
        seatMap: flight.seatMap.map((row) => ({
          row: row.number,
          cabinClass: row.cabinClass,
          extraLegroom: row.extraLegroom,
          seats: row.groups.flat(),
        })),
      },
    });
  },

  listNews: async ({ query }, now) => {
    const { items, total } = await listPublishedNews(query, now);
    return ok({
      data: items.map((item) => ({
        slug: item.slug,
        title: item.title,
        summary: item.summary,
        category: item.category,
        source: item.source,
        publishedAt: item.publishedAt,
        url: `/news/${item.slug}`,
      })),
      meta: { page: query.page, pageSize: query.pageSize, total },
    });
  },

  getNews: async ({ path }, now) => {
    const item = await getNews(path.slug, now);
    if (!item) return fail('NOT_FOUND', 'Новость не найдена');
    return ok({
      data: {
        slug: item.slug,
        title: item.title,
        summary: item.summary,
        category: item.category,
        source: item.source,
        publishedAt: item.publishedAt,
        url: `/news/${item.slug}`,
        body: item.body,
        tags: item.tags,
        externalUrl: item.externalUrl,
      },
    });
  },

  getStatsSummary: async ({ query }, now) => {
    const report = await getReport(query, now);
    const { period, today, inPeriod, allTime, byDay, bySection } = report;
    return ok({ data: { period, today, inPeriod, allTime, byDay, bySection } });
  },

  getAnalyticsReport: async ({ path, query }, now) => {
    const report = await getAnalytics(query, now);
    const base = { report: path.report, filter: report.filter };
    const data = {
      revenue: () => ({
        ...base,
        rows: report.revenueByMonth.map(({ month, label, revenue, orders }) => ({
          month,
          label,
          revenue,
          orders,
        })),
      }),
      destinations: () => ({ ...base, rows: report.topDestinations }),
      occupancy: () => ({
        ...base,
        byAirline: report.occupancyByAirline,
        byModel: report.occupancyByModel,
      }),
      structure: () => ({ ...base, classes: report.classShares, orders: report.statusShares }),
      routes: () => {
        const { orders, tickets, revenue, averageCheck, maxCheck } = report.totals;
        return {
          ...base,
          rows: report.routes,
          totals: { orders, tickets, revenue, averageCheck, maxCheck },
        };
      },
    }[path.report]();
    return ok({ data });
  },

  exportFlights: async ({ query }) => {
    const flights = (await listSchedule(query.date))
      .filter((flight) => matchesPlace(query.from, flight.origin))
      .filter((flight) => matchesPlace(query.to, flight.destination));
    return file(scheduleTable(flights), query.format, [
      'flights',
      query.date,
      query.from,
      query.to,
    ]);
  },

  exportNews: async ({ query }, now) => {
    const items = await listLatestNews({ source: query.source, limit: 1000 }, now);
    return file(newsTable(items, SITE_URL), query.format, ['news', query.source]);
  },

  exportAnalytics: async ({ path, query }, now) => {
    const report = await getAnalytics(query, now);
    const { from, to, airline, destination } = report.filter;
    return file(analyticsTable(path.report, report), query.format, [
      'analytics',
      path.report,
      from,
      to,
      airline,
      destination,
    ]);
  },
};
