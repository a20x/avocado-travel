import { seatCapacity } from '@/modules/catalog-data';
import { addDays, dateInZone, daysBetween, timeInZone } from '@/shared/lib/time';
import {
  SEARCH_DAYS_AHEAD,
  type AirlineFacet,
  type DeparturePeriod,
  type FlightOffer,
  type SearchQuery,
  type SortOption,
} from './model';

/**
 * Чистые правила поиска — без базы и HTTP, поэтому легко проверяются тестами.
 * Сервис достаёт из базы кандидатов и прогоняет их через эти функции.
 */

/** Строка из базы: рейс вместе со справочниками. */
export type FlightRow = Omit<
  FlightOffer,
  'durationMinutes' | 'cabinClass' | 'price' | 'seatsLeft'
> & {
  priceEconomy: number;
  priceBusiness: number;
  layout: {
    businessRows: number;
    businessLayout: string;
    economyRows: number;
    economyLayout: string;
  };
};

/** Можно ли искать на эту дату: от сегодня (по времени города вылета) до 60 дней вперёд. */
export function isSearchDateAllowed(todayInOrigin: string, date: string): boolean {
  const days = daysBetween(todayInOrigin, date);
  return days >= 0 && days <= SEARCH_DAYS_AHEAD;
}

/** Дата, которую поиск предлагает по умолчанию, — завтра по Москве. Она в окне продажи для любого города сети. */
export function defaultSearchDate(now: Date): string {
  return addDays(dateInZone(now, 'Europe/Moscow'), 1);
}

/** К какой части дня относится местное время `HH:MM`; ночь (00–06) в фильтр не входит. */
export function departurePeriod(time: string): DeparturePeriod | null {
  if (time >= '18:00') return 'evening';
  if (time >= '12:00') return 'day';
  if (time >= '06:00') return 'morning';
  return null;
}

/**
 * Превращает строки из базы в предложения: цена и места в выбранном классе,
 * только рейсы, где мест хватает на всех пассажиров.
 * `takenSeats` — сколько мест уже продано в этом классе по id рейса (появится с бронированием, T-13).
 */
export function buildOffers(
  rows: FlightRow[],
  query: Pick<SearchQuery, 'cabinClass' | 'passengers'>,
  takenSeats: ReadonlyMap<string, number> = new Map(),
): FlightOffer[] {
  return rows
    .map((row): FlightOffer => {
      const { priceEconomy, priceBusiness, layout, ...flight } = row;
      const capacity = seatCapacity(layout)[query.cabinClass];
      return {
        ...flight,
        durationMinutes: Math.round((row.arrivesAt.getTime() - row.departsAt.getTime()) / 60_000),
        cabinClass: query.cabinClass,
        price: query.cabinClass === 'business' ? priceBusiness : priceEconomy,
        seatsLeft: capacity - (takenSeats.get(row.id) ?? 0),
      };
    })
    .filter((offer) => offer.seatsLeft >= query.passengers);
}

/** Авиакомпании среди предложений с самой низкой ценой, от дешёвой к дорогой. */
export function airlineFacets(offers: FlightOffer[]): AirlineFacet[] {
  const facets = new Map<string, AirlineFacet>();
  for (const { airline, price } of offers) {
    const facet = facets.get(airline.code);
    if (!facet) {
      facets.set(airline.code, {
        code: airline.code,
        name: airline.name,
        logo: airline.logo,
        minPrice: price,
      });
    } else {
      facet.minPrice = Math.min(facet.minPrice, price);
    }
  }
  return [...facets.values()].sort(
    (a, b) => a.minPrice - b.minPrice || a.name.localeCompare(b.name),
  );
}

/** Фильтры страницы результатов: авиакомпании, время вылета, багаж. */
export function filterOffers(
  offers: FlightOffer[],
  query: Pick<SearchQuery, 'airlines' | 'times' | 'baggage'>,
): FlightOffer[] {
  return offers.filter((offer) => {
    if (query.airlines.length > 0 && !query.airlines.includes(offer.airline.code)) return false;
    if (query.baggage && !offer.airline.baggageIncluded) return false;
    if (query.times.length > 0) {
      const period = departurePeriod(timeInZone(offer.departsAt, offer.origin.timezone));
      if (!period || !query.times.includes(period)) return false;
    }
    return true;
  });
}

const BY: Record<SortOption, (a: FlightOffer, b: FlightOffer) => number> = {
  price: (a, b) => a.price - b.price,
  departure: (a, b) => a.departsAt.getTime() - b.departsAt.getTime(),
  duration: (a, b) => a.durationMinutes - b.durationMinutes,
};

/** Сортировка; при равенстве — по времени вылета, чтобы порядок всегда был одинаковым. */
export function sortOffers(offers: FlightOffer[], sort: SortOption): FlightOffer[] {
  return [...offers].sort((a, b) => BY[sort](a, b) || BY.departure(a, b));
}

/** Данные для ссылки на поиск: обязательны города и дата, остальное — по умолчанию. */
export type SearchLink = Pick<SearchQuery, 'from' | 'to' | 'date'> &
  Partial<Omit<SearchQuery, 'from' | 'to' | 'date'>>;

/**
 * Адрес страницы результатов. Значения по умолчанию в адрес не пишутся — ссылка короче.
 * Повторяющиеся параметры — по одному на значение: `airlines=LST&airlines=KRR`.
 */
export function searchUrl(query: SearchLink): string {
  const params = new URLSearchParams({ from: query.from, to: query.to, date: query.date });
  if (query.passengers && query.passengers !== 1)
    params.set('passengers', String(query.passengers));
  if (query.cabinClass && query.cabinClass !== 'economy')
    params.set('cabinClass', query.cabinClass);
  if (query.sort && query.sort !== 'price') params.set('sort', query.sort);
  for (const code of query.airlines ?? []) params.append('airlines', code);
  for (const time of query.times ?? []) params.append('times', time);
  if (query.baggage) params.set('baggage', 'on');
  return `/flights?${params}`;
}
