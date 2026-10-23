import 'server-only';
import { listAirportsInCity } from '@/modules/catalog-data/server';
import { fail, ok, type Result } from '@/shared/lib/result';
import { dateInZone, zonedDayRange } from '@/shared/lib/time';
import { z } from 'zod';
import { seatCapacity } from '@/modules/catalog-data';
import {
  searchQuerySchema,
  type FlightDetails,
  type FlightError,
  type SearchError,
  type SearchResult,
} from '../model';
import { buildSeatMap } from '../seat-map';
import {
  summarizeAirlines,
  summarizeDestinations,
  summarizeRoutes,
  type AirlineStats,
  type DestinationStats,
  type RouteSummary,
} from '../routes';
import {
  airlineFacets,
  buildOffers,
  filterOffers,
  isSearchDateAllowed,
  sortOffers,
  type FlightRow,
} from '../search';
import * as repository from './repository';

/**
 * Поиск рейсов на дату (docs/02-product.md, «Поиск рейсов»).
 * Принимает непроверенный ввод — например, параметры адреса страницы — и сам его проверяет.
 * `now` передаётся для тестов; по умолчанию — текущий момент.
 */
export async function searchFlights(
  input: unknown,
  now: Date = new Date(),
): Promise<Result<SearchResult, SearchError>> {
  const parsed = searchQuerySchema.safeParse(input);
  if (!parsed.success) return fail('INVALID_QUERY');
  const query = parsed.data;

  if (query.from === query.to) return fail('SAME_CITY');

  const [originAirports, destinationAirports] = await Promise.all([
    listAirportsInCity(query.from),
    listAirportsInCity(query.to),
  ]);
  const originTimezone = originAirports[0]?.timezone;
  if (!originTimezone || destinationAirports.length === 0) return fail('UNKNOWN_CITY');

  // Дата поиска — местная дата в городе вылета: «14 ноября» во Владивостоке начинается раньше, чем в Москве.
  if (!isSearchDateAllowed(dateInZone(now, originTimezone), query.date)) {
    return fail('DATE_OUT_OF_RANGE');
  }

  const day = zonedDayRange(query.date, originTimezone);
  const rows = await repository.findFlightCandidates({
    originCitySlug: query.from,
    destinationCitySlug: query.to,
    // Сегодня улетевшие рейсы не предлагаем.
    from: day.start > now ? day.start : now,
    to: day.end,
  });

  const taken = await repository.countTakenSeats(
    rows.map((row) => row.id),
    query.cabinClass,
    now,
  );
  // Авиакомпании для фильтра считаются до фильтров: иначе, отметив одну, не вернёшь остальные.
  const offers = buildOffers(rows, query, taken);
  return ok({
    query,
    offers: sortOffers(filterOffers(offers, query), query.sort),
    airlines: airlineFacets(offers),
  });
}

/** Часовой пояс расписания: дата выгрузки — московская, как у всего сайта. */
const SCHEDULE_TIMEZONE = 'Europe/Moscow';

/** Расписание сети на дату по Москве: все рейсы, вылетающие в этот день, по времени вылета. */
export function listSchedule(date: string): Promise<FlightRow[]> {
  const day = zonedDayRange(date, SCHEDULE_TIMEZONE);
  return repository.findFlightsDeparting(day.start, day.end);
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Ближайшие семь дней — по ним считаются «рейсов в неделю» и «цена от». */
function nextWeek(now: Date) {
  return { from: now, to: new Date(now.getTime() + WEEK_MS) };
}

/** Маршруты на ближайшую неделю; с `from` или `to` — только из этого города или в этот город. */
export async function listRoutes(
  filter: { from?: string; to?: string } = {},
  now: Date = new Date(),
): Promise<RouteSummary[]> {
  const rows = await repository.findRouteStats({
    originCitySlug: filter.from,
    destinationCitySlug: filter.to,
    ...nextWeek(now),
  });
  return summarizeRoutes(rows);
}

/** Сводка по городам прилёта на ближайшую неделю, ключ — `citySlug`. */
export async function listDestinationStats(
  now: Date = new Date(),
): Promise<Map<string, DestinationStats>> {
  return summarizeDestinations(await listRoutes({}, now));
}

/** Маршруты, города и флот авиакомпаний на ближайшую неделю, ключ — код авиакомпании. */
export async function listAirlineStats(now: Date = new Date()): Promise<Map<string, AirlineStats>> {
  return summarizeAirlines(await repository.findRouteStats(nextWeek(now)));
}

/**
 * Рейс для страницы с выбором мест и для оформления брони: схема салона с ценами и занятыми местами.
 * Принимает непроверенный id из адреса страницы.
 */
export async function getFlight(
  id: unknown,
  now: Date = new Date(),
): Promise<Result<FlightDetails, FlightError>> {
  const parsedId = z.uuid().safeParse(id);
  if (!parsedId.success) return fail('NOT_FOUND');

  const row = await repository.findFlightById(parsedId.data);
  if (!row) return fail('NOT_FOUND');

  const { priceEconomy, priceBusiness, layout, ...flight } = row;
  const prices = { economy: priceEconomy, business: priceBusiness };
  const taken = new Set(await repository.findTakenSeats(row.id, now));
  const seatMap = buildSeatMap(layout, prices, taken);
  const capacity = seatCapacity(layout);
  const takenIn = (cls: 'economy' | 'business') =>
    seatMap
      .filter((r) => r.cabinClass === cls)
      .flatMap((r) => r.groups.flat())
      .filter((seat) => seat.taken).length;

  return ok({
    ...flight,
    durationMinutes: Math.round((row.arrivesAt.getTime() - row.departsAt.getTime()) / 60_000),
    prices,
    seatsLeft: {
      economy: capacity.economy - takenIn('economy'),
      business: capacity.business - takenIn('business'),
    },
    seatMap,
    isDeparted: row.departsAt <= now,
  });
}
