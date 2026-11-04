import 'server-only';
import {
  listAircraftModels,
  listAirlines,
  listAirports,
  listAirportsInCity,
} from '@/modules/catalog-data/server';
import { fail, ok, type Result } from '@/shared/lib/result';
import { nearestDates } from '@/shared/lib/available-days';
import { dateInZone, zonedDayRange } from '@/shared/lib/time';
import { z } from 'zod';
import { seatCapacity } from '@/modules/catalog-data';
import {
  SEARCH_DAYS_AHEAD,
  searchQuerySchema,
  type FlightDetails,
  type FlightError,
  type SearchError,
  type SearchResult,
  type SearchRoute,
} from '../model';
import {
  distanceKm,
  flightMinutes,
  nextFlightNumber,
  planFlights,
  schedulePrices,
  type AdminRoute,
  type FlightScheduleError,
  type FlightScheduleInput,
  findDuplicateFlights,
  type FlightDuplicates,
} from '../schedule';
import {
  findRepeatedFlight,
  planFlightEdit,
  planRouteEdit,
  routeRefSchema,
  type FlightChange,
  type FlightEditError,
  type FlightEditInput,
  type FlightEditView,
  type RouteEditInput,
  type RouteRef,
} from '../edit';
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

/**
 * Направления с рейсами в окне продажи — для поиска-фразы: в «Куда» остаются только города,
 * куда можно улететь из выбранного, а календарь ограничен днями этих рейсов.
 */
export function listSearchRoutes(now: Date = new Date()): Promise<SearchRoute[]> {
  return repository.findSearchRoutes(now, SEARCH_DAYS_AHEAD);
}

/** На дату поиска рейсов нет — до трёх ближайших дат, когда по направлению летаем. */
export async function listNearestSearchDates(
  query: { from: string; to: string; date: string },
  now: Date = new Date(),
): Promise<string[]> {
  const days = await repository.findSearchDays(query, now, SEARCH_DAYS_AHEAD);
  return nearestDates(
    days.filter((day) => day !== query.date),
    query.date,
    query.date,
  );
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

/*
 * Рейсы, которые заводит администратор (раздел «Рейсы» админки). Ввод проверяет схема
 * flightScheduleSchema, права — action; здесь — правила, которым нужны справочники и база.
 */

/** Даты в форме рейсов — по Москве, как у остальной админки. */
const ADMIN_TIMEZONE = 'Europe/Moscow';

/** Ошибка «дубли»: сколько рейсов повторяют существующие и первый из них — для сообщения. */
export type DuplicateFailure = { ok: false; error: 'DUPLICATE'; duplicates: FlightDuplicates };

/**
 * Заводит рейсы по расписанию (и обратные, если отмечено); сколько рейсов создано.
 * Если хоть один рейс повторяет уже заведённый — не заводит ни одного (DUPLICATE).
 */
export async function createFlights(
  input: FlightScheduleInput,
  now: Date = new Date(),
): Promise<
  Result<{ flights: number }, Exclude<FlightScheduleError, 'DUPLICATE'>> | DuplicateFailure
> {
  const [airlines, airports, models] = await Promise.all([
    listAirlines(),
    listAirports(),
    listAircraftModels(),
  ]);
  const airline = airlines.find((item) => item.code === input.airline);
  if (!airline) return fail('UNKNOWN_AIRLINE');
  const origin = airports.find((item) => item.iata === input.origin);
  const destination = airports.find((item) => item.iata === input.destination);
  if (!origin || !destination) return fail('UNKNOWN_AIRPORT');
  if (origin.citySlug === destination.citySlug) return fail('SAME_CITY');
  if (!models.some((model) => model.id === input.aircraftModelId)) return fail('UNKNOWN_AIRCRAFT');
  if (input.dateFrom < dateInZone(now, ADMIN_TIMEZONE)) return fail('DATE_IN_PAST');

  const km = distanceKm(origin, destination);
  const number = nextFlightNumber(airline.code, await repository.findFlightNumbers(airline.id));
  const rows = planFlights(input, {
    airlineId: airline.id,
    aircraftModelId: input.aircraftModelId,
    origin,
    destination,
    number: `${airline.code} ${number}`,
    returnNumber: `${airline.code} ${number + 1}`,
    durationMinutes: input.durationMinutes ?? flightMinutes(km),
    prices: schedulePrices(input, km),
  });
  if (rows.length === 0) return fail('NO_DATES');

  const existing = await repository.findFlightsAt(
    airline.id,
    rows.map((row) => row.departsAt),
  );
  const duplicates = findDuplicateFlights(rows, existing);
  if (duplicates) return { ok: false, error: 'DUPLICATE', duplicates };

  await repository.insertFlights(rows);
  return ok({ flights: rows.length });
}

const filterValue = (value: unknown) =>
  typeof value === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(value) ? value : undefined;

/** Маршруты для таблицы админки по алфавиту городов; фильтры — из адреса страницы. */
export async function listRoutesForAdmin(params: {
  city?: unknown;
  airline?: unknown;
}): Promise<AdminRoute[]> {
  const rows = await repository.findAdminRoutes({
    city: filterValue(params.city),
    airline: filterValue(params.airline),
  });
  return rows.sort(
    (a, b) =>
      a.originCity.localeCompare(b.originCity, 'ru') ||
      a.destinationCity.localeCompare(b.destinationCity, 'ru') ||
      a.airlineName.localeCompare(b.airlineName, 'ru') ||
      a.originIata.localeCompare(b.originIata),
  );
}

/** Удаляет все рейсы маршрута, если на них нет ни одного билета; сколько удалено. */
export async function deleteRoute(route: {
  airline: string;
  origin: string;
  destination: string;
}): Promise<Result<{ flights: number }, FlightScheduleError>> {
  const [airlines, airports] = await Promise.all([listAirlines(), listAirports()]);
  const airline = airlines.find((item) => item.code === route.airline);
  const origin = airports.find((item) => item.iata === route.origin);
  const destination = airports.find((item) => item.iata === route.destination);
  if (!airline || !origin || !destination) return fail('ROUTE_NOT_FOUND');

  const key = { airlineId: airline.id, originId: origin.id, destinationId: destination.id };
  const counts = await repository.countRoute(key);
  if (counts.flights === 0) return fail('ROUTE_NOT_FOUND');
  if (counts.tickets > 0) return fail('HAS_TICKETS');
  return ok({ flights: await repository.deleteRoute(key) });
}

/*
 * Правка рейсов в админке: один рейс или все предстоящие рейсы маршрута. Ввод проверяют
 * схемы из edit.ts, права — action; здесь — справочники, база и проверка дублей.
 */

/** Ошибка «дубли» при правке: сколько рейсов совпали и первый из них. */
export type EditDuplicateFailure = { ok: false; error: 'DUPLICATE'; duplicates: FlightDuplicates };

/** Маршрут из адреса → ключи в базе и названия; чужое или несуществующее — null. */
async function resolveRoute(params: Record<string, unknown>) {
  const parsed = routeRefSchema.safeParse(params);
  if (!parsed.success) return null;
  const [airlines, airports] = await Promise.all([listAirlines(), listAirports()]);
  const airline = airlines.find((item) => item.code === parsed.data.airline);
  const origin = airports.find((item) => item.iata === parsed.data.origin);
  const destination = airports.find((item) => item.iata === parsed.data.destination);
  if (!airline || !origin || !destination) return null;
  return {
    ref: parsed.data,
    key: { airlineId: airline.id, originId: origin.id, destinationId: destination.id },
    title: {
      airlineName: airline.name,
      originCity: origin.city,
      destinationCity: destination.city,
    },
  };
}

export const ROUTE_FLIGHTS_PAGE_SIZE = 20;

export type RouteFlightsPage = {
  ref: RouteRef;
  title: { airlineName: string; originCity: string; destinationCity: string };
  flights: FlightEditView[];
  upcoming: number;
  past: number;
  page: number;
  totalPages: number;
};

/** Страница маршрута в админке: предстоящие рейсы по 20, сколько уже улетело. */
export async function getRouteFlights(
  params: Record<string, unknown>,
  now: Date = new Date(),
): Promise<RouteFlightsPage | null> {
  const route = await resolveRoute(params);
  if (!route) return null;
  const counts = await repository.countRouteFlights(route.key, now);
  if (counts.upcoming + counts.past === 0) return null;
  const totalPages = Math.max(1, Math.ceil(counts.upcoming / ROUTE_FLIGHTS_PAGE_SIZE));
  const requested = Number(Array.isArray(params.page) ? params.page[0] : params.page);
  const page = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), totalPages) : 1;
  const flights = await repository.findUpcomingRouteFlights(route.key, now, {
    limit: ROUTE_FLIGHTS_PAGE_SIZE,
    offset: (page - 1) * ROUTE_FLIGHTS_PAGE_SIZE,
  });
  return { ref: route.ref, title: route.title, flights, ...counts, page, totalPages };
}

/** Рейс для формы правки; нет такого — null. */
export async function getFlightForEdit(
  id: string,
  now: Date = new Date(),
): Promise<FlightEditView | null> {
  if (!z.uuid().safeParse(id).success) return null;
  return (await repository.findFlightView(id, now)) ?? null;
}

/** Дубли после правки: с другими рейсами (правленые не считаются) и между самими правлеными. */
async function findEditDuplicates(changes: FlightChange[]): Promise<FlightDuplicates | null> {
  const [first] = changes;
  if (!first) return null;
  const ids = new Set(changes.map((flight) => flight.id));
  const existing = await repository.findFlightsAt(
    first.airlineId,
    changes.map((flight) => flight.departsAt),
  );
  const duplicates = findDuplicateFlights(
    changes,
    existing.filter((flight) => !ids.has(flight.id)),
  );
  if (duplicates) return duplicates;
  const repeated = findRepeatedFlight(changes);
  return repeated ? { count: 1, total: changes.length, first: repeated } : null;
}

/** Меняет один рейс; возвращает маршрут — туда админка и вернётся. */
export async function updateFlight(
  id: string,
  input: FlightEditInput,
  now: Date = new Date(),
): Promise<
  Result<{ route: RouteRef }, Exclude<FlightEditError, 'DUPLICATE'>> | EditDuplicateFailure
> {
  const flight = await getFlightForEdit(id, now);
  if (!flight) return fail('NOT_FOUND');
  const models = await listAircraftModels();
  if (!models.some((model) => model.id === input.aircraftModelId)) return fail('UNKNOWN_AIRCRAFT');
  const planned = planFlightEdit(flight, input, now);
  if (!planned.ok) return fail(planned.error as Exclude<FlightEditError, 'DUPLICATE'>);
  const duplicates = await findEditDuplicates([planned.data]);
  if (duplicates) return { ok: false, error: 'DUPLICATE', duplicates };
  await repository.updateFlights([planned.data]);
  return ok({
    route: {
      airline: flight.airlineCode,
      origin: flight.originIata,
      destination: flight.destinationIata,
    },
  });
}

/** Меняет все предстоящие рейсы маршрута; сколько рейсов изменено. */
export async function updateRoute(
  params: Record<string, unknown>,
  input: RouteEditInput,
  now: Date = new Date(),
): Promise<
  | Result<{ route: RouteRef; flights: number }, Exclude<FlightEditError, 'DUPLICATE'>>
  | EditDuplicateFailure
> {
  const route = await resolveRoute(params);
  if (!route) return fail('NOT_FOUND');
  if (input.aircraftModelId !== undefined) {
    const models = await listAircraftModels();
    if (!models.some((model) => model.id === input.aircraftModelId)) {
      return fail('UNKNOWN_AIRCRAFT');
    }
  }
  const flights = await repository.findUpcomingRouteFlights(route.key, now);
  const planned = planRouteEdit(flights, input, now);
  if (!planned.ok) return fail(planned.error as Exclude<FlightEditError, 'DUPLICATE'>);
  const duplicates = await findEditDuplicates(planned.data);
  if (duplicates) return { ok: false, error: 'DUPLICATE', duplicates };
  await repository.updateFlights(planned.data);
  return ok({ route: route.ref, flights: planned.data.length });
}
