import 'server-only';
import { listAirportsInCity } from '@/modules/catalog-data/server';
import { fail, ok, type Result } from '@/shared/lib/result';
import { dateInZone, zonedDayRange } from '@/shared/lib/time';
import { searchQuerySchema, type FlightOffer, type SearchError } from '../model';
import { isSearchDateAllowed, toOffers } from '../search';
import * as repository from './repository';

/**
 * Поиск рейсов на дату (docs/02-product.md, «Поиск рейсов»).
 * Принимает непроверенный ввод — например, параметры адреса страницы — и сам его проверяет.
 * `now` передаётся для тестов; по умолчанию — текущий момент.
 */
export async function searchFlights(
  input: unknown,
  now: Date = new Date(),
): Promise<Result<FlightOffer[], SearchError>> {
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

  return ok(toOffers(rows, query));
}
